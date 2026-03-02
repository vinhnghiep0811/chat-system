from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .email_service import send_verification_email

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ResendVerificationSerializer,
    UpdateProfileSerializer,
    ChangePasswordSerializer,
)
from .token import make_email_verify_token, verify_email_token
from .cookies import set_auth_cookies, clear_auth_cookies
from .permissions import IsVerified

import logging
logger = logging.getLogger(__name__)

User = get_user_model()

class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        created_now = getattr(user, "_created_now", True)
        token = make_email_verify_token(user.id)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
        verify_url = f"{backend_url}/api/users/verify-email?token={token}"

        try:
            send_verification_email(user.email, verify_url)
            mail_sent = True
        except Exception:
            logger.exception("Resend send_verification_email failed user_id=%s", user.id)
            mail_sent = False

        return Response(
            {
                "message": "Registered. Please verify email." if mail_sent
                        else "Registered, but could not send verification email. Please use 'Resend verification email'.",
                "mail_sent": mail_sent,
            },
            status=status.HTTP_201_CREATED if created_now else status.HTTP_200_OK,
        )


class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"error": "Missing token"}, status=400)

        try:
            user_id = verify_email_token(token)
        except Exception:
            # SignatureExpired / BadSignature -> coi như invalid
            return Response({"error": "Invalid or expired token"}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "User not found"}, status=404)

        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified"])

        # Tạo JWT và set cookie
        # refresh = RefreshToken.for_user(user)
        # access = str(refresh.access_token)

        # Redirect về FE và set cookie trên response
        # (cookie set được vì response là từ backend)
        resp = redirect(f"{settings.FRONTEND_URL}/auth/login?verified=1")
        # set_auth_cookies(resp, access=access, refresh=str(refresh), secure=not settings.DEBUG)
        return resp

class ResendVerificationView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email=email).first()

        if user and not user.is_verified:
            token = make_email_verify_token(user.id)
            backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
            verify_url = f"{backend_url}/api/users/verify-email?token={token}"

            send_mail(
                subject="Verify your email",
                message=f"Click to verify: {verify_url}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,  # tránh lộ lỗi mail
            )

        # Luôn trả 200 để tránh lộ email
        return Response(
            {"message": "If the email exists, a verification email has been sent."},
            status=status.HTTP_200_OK,
        )

class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        resp = Response(
            {
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_200_OK,
        )

        # dev: secure=False, deploy: secure=True (https)
        set_auth_cookies(resp, access=access, refresh=str(refresh), secure=not settings.DEBUG)
        return resp


class LogoutView(APIView):
    def post(self, request):
        resp = Response({"message": "Logged out"}, status=200)
        clear_auth_cookies(resp)
        return resp

class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "Missing refresh token"}, status=401)

        try:
            refresh = RefreshToken(refresh_token)
            access = str(refresh.access_token)

            # Nếu ROTATE_REFRESH_TOKENS=True thì generate refresh mới bằng cách:
            # (SimpleJWT không tự rotate khi bạn tự parse token,
            # nên cách an toàn là tạo refresh mới từ user.)
            # => Cần lấy user_id từ token payload:
            user_id = refresh["user_id"]

        except TokenError:
            resp = Response({"detail": "Invalid refresh token"}, status=401)
            clear_auth_cookies(resp)
            return resp

        user = User.objects.filter(id=user_id).first()
        if not user or not user.is_verified:
            resp = Response({"detail": "Unauthorized"}, status=401)
            clear_auth_cookies(resp)
            return resp

        new_refresh = RefreshToken.for_user(user)
        resp = Response({"message": "refreshed"}, status=200)
        set_auth_cookies(resp, access=access, refresh=str(new_refresh), secure=not settings.DEBUG)
        return resp


class MeView(APIView):
    permission_classes = [IsAuthenticated, IsVerified] 

    def get(self, request):
        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_verified": u.is_verified,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_verified": u.is_verified,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password updated successfully."}, status=status.HTTP_200_OK
        )

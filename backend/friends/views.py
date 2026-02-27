# friends/views.py
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FriendRequest, Friendship
from .serializers import (
    SendFriendRequestSerializer,
    FriendRequestSerializer,
    FriendSerializer,
)
from .services import are_friends

User = get_user_model()


class SendFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = SendFriendRequestSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        to_user = ser.validated_data["to_user"]

        # nếu người kia đã gửi bạn trước đó và đang pending → accept luôn (optional)
        reverse_req = FriendRequest.objects.filter(
            from_user=to_user, to_user=request.user, status=FriendRequest.Status.PENDING
        ).first()

        if reverse_req:
            return Response(
                {"detail": "User already sent you a request. You can accept it in incoming list."},
                status=status.HTTP_409_CONFLICT,
            )

        # tạo pending request
        fr, created = FriendRequest.objects.get_or_create(
            from_user=request.user,
            to_user=to_user,
            status=FriendRequest.Status.PENDING,
            defaults={},
        )

        if not created:
            return Response({"detail": "Friend request already sent."}, status=status.HTTP_409_CONFLICT)

        return Response(FriendRequestSerializer(fr).data, status=status.HTTP_201_CREATED)


class IncomingFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = FriendRequest.objects.filter(to_user=request.user, status=FriendRequest.Status.PENDING).order_by("-created_at")
        return Response(FriendRequestSerializer(qs, many=True).data)


class OutgoingFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = FriendRequest.objects.filter(from_user=request.user, status=FriendRequest.Status.PENDING).order_by("-created_at")
        return Response(FriendRequestSerializer(qs, many=True).data)


class AcceptFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk: int):
        fr = FriendRequest.objects.select_for_update().filter(
            pk=pk, to_user=request.user, status=FriendRequest.Status.PENDING
        ).first()
        if not fr:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if are_friends(fr.from_user_id, fr.to_user_id):
            # idempotent
            fr.status = FriendRequest.Status.ACCEPTED
            fr.responded_at = timezone.now()
            fr.save(update_fields=["status", "responded_at"])
            return Response({"detail": "Already friends."})

        # tạo friendship
        u1, u2 = Friendship.normalize_pair(fr.from_user_id, fr.to_user_id)
        Friendship.objects.get_or_create(user1_id=u1, user2_id=u2)

        # update request status
        fr.status = FriendRequest.Status.ACCEPTED
        fr.responded_at = timezone.now()
        fr.save(update_fields=["status", "responded_at"])

        return Response({"detail": "Accepted."}, status=status.HTTP_200_OK)


class RejectFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        fr = FriendRequest.objects.filter(
            pk=pk, to_user=request.user, status=FriendRequest.Status.PENDING
        ).first()
        if not fr:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        fr.status = FriendRequest.Status.REJECTED
        fr.responded_at = timezone.now()
        fr.save(update_fields=["status", "responded_at"])
        return Response({"detail": "Rejected."}, status=status.HTTP_200_OK)


class FriendsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # lấy tất cả Friendship có user hiện tại
        uid = request.user.id
        qs = Friendship.objects.filter(Q(user1_id=uid) | Q(user2_id=uid))

        friend_ids = []
        for f in qs:
            friend_ids.append(f.user2_id if f.user1_id == uid else f.user1_id)

        users = User.objects.filter(id__in=friend_ids).only(
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        )
        data = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name or "",
                "last_name": u.last_name or "",
            }
            for u in users
        ]
        return Response(data, status=status.HTTP_200_OK)

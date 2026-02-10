from django.urls import path
from .views import RegisterView, VerifyEmailView, LoginView, LogoutView, RefreshView, MeView, ResendVerificationView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("verify-email/", VerifyEmailView.as_view()),
    path("login/", LoginView.as_view()),
    path("refresh/", RefreshView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", MeView.as_view()),
    path("resend-verification/", ResendVerificationView.as_view()),
]

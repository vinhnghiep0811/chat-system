# friends/urls.py
from django.urls import path
from .views import (
    SendFriendRequestView,
    IncomingFriendRequestsView,
    OutgoingFriendRequestsView,
    AcceptFriendRequestView,
    RejectFriendRequestView,
    FriendsListView,
)

urlpatterns = [
    path("requests/", SendFriendRequestView.as_view()),
    path("requests/incoming/", IncomingFriendRequestsView.as_view()),
    path("requests/outgoing/", OutgoingFriendRequestsView.as_view()),
    path("requests/<int:pk>/accept/", AcceptFriendRequestView.as_view()),
    path("requests/<int:pk>/reject/", RejectFriendRequestView.as_view()),
    path("", FriendsListView.as_view()),
]

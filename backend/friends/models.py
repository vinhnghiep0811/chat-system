# friends/models.py
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL


class FriendRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING"
        ACCEPTED = "ACCEPTED"
        REJECTED = "REJECTED"

    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_friend_requests")
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_friend_requests")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=~Q(from_user=models.F("to_user")),
                name="friend_request_no_self",
            ),
            models.UniqueConstraint(
                fields=["from_user", "to_user"],
                condition=Q(status="PENDING"),
                name="unique_pending_friend_request",
            ),
        ]

    def clean(self):
        if self.from_user_id == self.to_user_id:
            raise ValidationError("Cannot send friend request to yourself.")


class Friendship(models.Model):
    """
    Store symmetric friendship:
      user1_id < user2_id always
    """
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friendships_as_user1")
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friendships_as_user2")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(user1__lt=models.F("user2")),
                name="friendship_user1_lt_user2",
            ),
            models.UniqueConstraint(fields=["user1", "user2"], name="unique_friendship_pair"),
        ]

    @staticmethod
    def normalize_pair(a_id: int, b_id: int):
        return (a_id, b_id) if a_id < b_id else (b_id, a_id)

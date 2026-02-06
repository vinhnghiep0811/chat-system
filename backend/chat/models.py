from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    TYPE_DM = "dm"

    type = models.CharField(max_length=10, default=TYPE_DM)
    created_at = models.DateTimeField(auto_now_add=True)
    dm_user1 = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    dm_user2 = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name="+")

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(Q(type="dm", dm_user1__isnull=False, dm_user2__isnull=False) | ~Q(type="dm")),
                name="dm_requires_pair",
            ),
            models.CheckConstraint(
                check=(Q(dm_user1__lt=models.F("dm_user2")) | Q(dm_user1__isnull=True) | Q(dm_user2__isnull=True)),
                name="dm_user1_lt_user2",
            ),
            models.UniqueConstraint(fields=["type", "dm_user1", "dm_user2"], name="unique_dm_pair"),
        ]


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversation_participations")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["conversation", "user"], name="uniq_participant"),
        ]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    thread_root = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="thread_replies",
    )

    class Meta:
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["thread_root", "created_at"]),
        ]

    def clean(self):
        # thread_root phải là root (không lồng thread)
        if self.thread_root_id and self.thread_root.thread_root_id is not None:
            raise ValueError("thread_root must be a root message (thread_root is NULL).")

        # thread_root phải cùng conversation
        if self.thread_root_id and self.thread_root.conversation_id != self.conversation_id:
            raise ValueError("thread_root must be in the same conversation.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

class ConversationReadState(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="read_states")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversation_read_states")

    last_seen_message = models.ForeignKey(
        Message, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["conversation", "user"], name="uniq_read_state"),
        ]

    def mark_seen(self, message: Message | None):
        self.last_seen_message = message
        self.last_seen_at = timezone.now()

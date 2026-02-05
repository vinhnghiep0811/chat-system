from django.db import transaction
from django.contrib.auth import get_user_model

from friends.models import Friendship
from .models import Conversation, ConversationParticipant

User = get_user_model()

@transaction.atomic
def get_or_create_dm(user_a, user_b):
    u1_id, u2_id = Friendship.normalize_pair(user_a.id, user_b.id)

    conv = Conversation.objects.filter(
        type="dm",
        dm_user1_id=u1_id,
        dm_user2_id=u2_id,
    ).first()

    if conv:
        return conv, False

    conv = Conversation.objects.create(type="dm", dm_user1_id=u1_id, dm_user2_id=u2_id)
    ConversationParticipant.objects.create(conversation=conv, user=user_a)
    ConversationParticipant.objects.create(conversation=conv, user=user_b)
    return conv, True

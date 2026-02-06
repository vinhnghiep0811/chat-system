from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, ConversationParticipant, Message

User = get_user_model()


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = ConversationParticipant
        fields = ["user_id", "joined_at"]


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Conversation
        fields = ["id", "type", "created_at", "participants", "unread_count"]


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender_id", "content", "created_at", "thread_root"]
        read_only_fields = ["id", "created_at", "sender_id", "conversation", "thread_root"]

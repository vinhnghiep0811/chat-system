from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import FriendRequest, Friendship
from .services import are_friends

User = get_user_model()

class SendFriendRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField()  # username hoặc email

    def validate_identifier(self, value):
        value = value.strip()
        return value

    def validate(self, attrs):
        request = self.context["request"]
        identifier = attrs["identifier"]

        # tìm user theo email hoặc username
        qs = User.objects.all()
        to_user = qs.filter(email__iexact=identifier).first() or qs.filter(username__iexact=identifier).first()
        if not to_user:
            raise serializers.ValidationError({"identifier": "User not found by username/email."})

        if to_user.id == request.user.id:
            raise serializers.ValidationError({"identifier": "Cannot add yourself."})

        if are_friends(request.user.id, to_user.id):
            raise serializers.ValidationError({"identifier": "You are already friends."})

        attrs["to_user"] = to_user
        return attrs


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = serializers.SerializerMethodField()
    to_user = serializers.SerializerMethodField()

    class Meta:
        model = FriendRequest
        fields = ["id", "from_user", "to_user", "status", "created_at", "responded_at"]

    def get_from_user(self, obj):
        return {"id": obj.from_user_id, "username": getattr(obj.from_user, "username", None), "email": obj.from_user.email}

    def get_to_user(self, obj):
        return {"id": obj.to_user_id, "username": getattr(obj.to_user, "username", None), "email": obj.to_user.email}


class FriendSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()

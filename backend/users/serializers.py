from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "username"]

    def validate_email(self, v):
        return v.lower().strip()

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = True
        user.is_verified = False
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()  # email hoặc username
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = (attrs.get("identifier") or "").strip()
        password = attrs.get("password") or ""

        # Xác định email hay username
        if "@" in identifier:
            # login bằng email -> tìm user theo email
            user = User.objects.filter(email__iexact=identifier).first()
            if not user:
                raise serializers.ValidationError({"identifier": "Email không tồn tại."})
            username = user.username
        else:
            username = identifier

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Sai thông tin đăng nhập."})

        if not user.is_verified:
            raise serializers.ValidationError({"detail": "Email chưa được xác minh."})

        attrs["user"] = user
        return attrs
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
        email = validated_data.get("email")
        existing = User.objects.filter(email=email).first()

        if existing:
            if existing.is_verified:
                raise serializers.ValidationError({"email": "Email already exists."})

            # Email đã tồn tại nhưng chưa verify -> coi như resend/re-register
            # Update thông tin (tuỳ bạn muốn update gì)
            for field in ["first_name", "last_name", "username"]:
                if field in validated_data and validated_data[field]:
                    setattr(existing, field, validated_data[field])

            # Option: cho set lại password khi re-register
            existing.set_password(password)

            existing.is_active = True
            existing.is_verified = False
            existing.save(update_fields=["first_name", "last_name", "username", "password", "is_active", "is_verified"])
            existing._created_now = False  # flag để view biết không phải user mới tạo
            return existing
        
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = True
        user.is_verified = False
        user.save()
        user._created_now = True
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
            raise serializers.ValidationError({
                "detail": "Sai thông tin đăng nhập.",
                "code": "INVALID_CREDENTIALS",
            })

        if not user.is_verified:
            raise serializers.ValidationError({
                "detail": "Email chưa được xác minh.",
                "code": "EMAIL_NOT_VERIFIED",
            })  

        attrs["user"] = user
        return attrs
    
class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, v):
        return v.lower().strip()
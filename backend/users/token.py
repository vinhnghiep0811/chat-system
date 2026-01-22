from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

signer = TimestampSigner(salt="email-verify")

def make_email_verify_token(user_id: int) -> str:
    return signer.sign(str(user_id))

def verify_email_token(token: str, max_age_seconds: int = 60 * 60 * 24) -> int:
    # trả về user_id nếu hợp lệ
    value = signer.unsign(token, max_age=max_age_seconds)
    return int(value)

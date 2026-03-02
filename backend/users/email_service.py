import os
import resend

resend.api_key = os.environ["RESEND_API_KEY"]

def send_verification_email(to_email: str, verify_url: str) -> None:
    from_email = os.getenv("RESEND_FROM_EMAIL", "Chat System <onboarding@resend.dev>")
    params: resend.Emails.SendParams = {
        "from": from_email,
        "to": [to_email],
        "subject": "Verify your email",
        "html": f"<p>Click to verify:</p><p><a href='{verify_url}'>{verify_url}</a></p>",
    }
    resend.Emails.send(params)
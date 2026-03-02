import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()  # MUST be before importing consumers/routing

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator

from chat.ws_auth import JwtAuthMiddlewareStack

# Import routing AFTER Django setup is ready
from chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": OriginValidator(
        JwtAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
        [
            "https://chat-system-bay.vercel.app",
        ]
    ),
})
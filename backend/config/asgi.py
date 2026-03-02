import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator

from chat.ws_auth import JwtAuthMiddlewareStack
from chat.routing import websocket_urlpatterns

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": OriginValidator(
        JwtAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
        [
            "https://chat-system-bay.vercel.app",
        ],
    ),
})
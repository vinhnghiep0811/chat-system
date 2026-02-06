# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Conversation, ConversationParticipant, Message
from django.utils import timezone
from .models import ConversationReadState

class EchoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({"type": "connected"}))

    async def receive(self, text_data=None, bytes_data=None):
        # echo lại đúng thứ client gửi
        await self.send(text_data=text_data or "")

    async def disconnect(self, close_code):
        pass


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.conversation_id = int(self.scope["url_route"]["kwargs"]["conversation_id"])

        print("[WS] connect conv=", self.conversation_id, "user=", getattr(self.user, "id", None), "anon=", getattr(self.user, "is_anonymous", True))

        if not self.user or self.user.is_anonymous:
            print("[WS] REJECT 4401: anonymous")
            await self.close(code=4401)  # unauthorized
            return

        ok = await self._is_participant(self.conversation_id, self.user.id)
        if not ok:
            print("[WS] REJECT 4403: not participant")
            await self.close(code=4403)  # forbidden
            return

        self.group_name = f"conversation_{self.conversation_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_json({"type": "connected", "conversation_id": self.conversation_id})

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except Exception:
            await self.send_json({"type": "error", "message": "Invalid JSON"})
            return

        msg_type = data.get("type")

        if msg_type == "message.send":
            content = (data.get("content") or "").strip()
            if not content:
                await self.send_json({"type": "error", "message": "Content is required"})
                return

            thread_root_id = data.get("thread_root_id")
            try:
                msg = await self._create_message(
                    conversation_id=self.conversation_id,
                    sender_id=self.user.id,
                    content=content,
                    thread_root_id=thread_root_id,
                )
            except ValueError as e:
                await self.send_json({"type": "error", "message": str(e)})
                return

            await self.channel_layer.group_send(
                self.group_name,
                {"type": "chat.broadcast", "payload": {"type": "message.new", "message": msg}}
            )
            return

        if msg_type == "read.seen":
            last_seen_id = data.get("last_seen_message_id")
            if last_seen_id is None:
                await self.send_json({"type": "error", "message": "last_seen_message_id is required"})
                return

            try:
                state = await self._mark_seen(
                    conversation_id=self.conversation_id,
                    user_id=self.user.id,
                    last_seen_message_id=int(last_seen_id),
                )
            except ValueError as e:
                await self.send_json({"type": "error", "message": str(e)})
                return

            # broadcast cho cả room để update UI 2 phía
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "chat.broadcast", "payload": {"type": "read.updated", "state": state}}
            )
            return

        await self.send_json({"type": "error", "message": "Unknown event type"})


    async def chat_broadcast(self, event):
        await self.send_json(event["payload"])

    async def send_json(self, data):
        await self.send(text_data=json.dumps(data))

    # ===== DB helpers =====
    @database_sync_to_async
    def _is_participant(self, conversation_id: int, user_id: int) -> bool:
        return ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id
        ).exists()

    @database_sync_to_async
    def _create_message(self, conversation_id: int, sender_id: int, content: str, thread_root_id=None) -> dict:
        # Validate conversation exists
        if not Conversation.objects.filter(id=conversation_id).exists():
            raise ValueError("Conversation not found.")

        # Validate thread_root nếu có
        if thread_root_id is not None:
            root = Message.objects.filter(id=thread_root_id).first()
            if not root:
                raise ValueError("thread_root_id not found.")
            if root.thread_root_id is not None:
                raise ValueError("thread_root must be a root message (thread_root is NULL).")
            if root.conversation_id != conversation_id:
                raise ValueError("thread_root must be in the same conversation.")

        m = Message.objects.create(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            thread_root_id=thread_root_id,
        )

        return {
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_id": m.sender_id,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
            "thread_root_id": m.thread_root_id,
        }
    
    @database_sync_to_async
    def _mark_seen(self, conversation_id: int, user_id: int, last_seen_message_id: int) -> dict:
        # ensure message thuộc conversation
        msg = Message.objects.filter(id=last_seen_message_id, conversation_id=conversation_id).first()
        if not msg:
            raise ValueError("Message not found in this conversation.")

        state, _ = ConversationReadState.objects.get_or_create(
            conversation_id=conversation_id,
            user_id=user_id,
        )

        # chỉ update nếu tiến lên (không lùi)
        if state.last_seen_message_id is None or last_seen_message_id > state.last_seen_message_id:
            state.last_seen_message = msg
            state.last_seen_at = timezone.now()
            state.save(update_fields=["last_seen_message", "last_seen_at"])

        return {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "last_seen_message_id": state.last_seen_message_id,
            "last_seen_at": state.last_seen_at.isoformat() if state.last_seen_at else None,
        }


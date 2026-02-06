from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, ListCreateAPIView

from .models import Conversation, ConversationParticipant, Message, ConversationReadState
from .serializers import ConversationSerializer, MessageSerializer
from .services import get_or_create_dm
from friends.services import are_friends
from django.shortcuts import get_object_or_404

User = get_user_model()


def is_member(conversation_id: int, user_id: int) -> bool:
    return ConversationParticipant.objects.filter(conversation_id=conversation_id, user_id=user_id).exists()


class ConversationListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants__user=self.request.user).distinct().order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = self.get_serializer(qs, many=True).data

        conv_ids = [c["id"] for c in data]

        states = {
            s.conversation_id: s.last_seen_message_id
            for s in ConversationReadState.objects.filter(user=request.user, conversation_id__in=conv_ids)
        }

        for c in data:
            conv_id = c["id"]
            last_seen = states.get(conv_id)

            q = Message.objects.filter(conversation_id=conv_id).exclude(sender=request.user)
            if last_seen:
                q = q.filter(id__gt=last_seen)

            c["unread_count"] = q.count()

        return Response(data)

class CreateDMView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        friend_id = request.data.get("user_id")
        if not friend_id:
            return Response({"detail": "user_id is required"}, status=400)

        friend_id = int(friend_id)
        if friend_id == request.user.id:
            return Response({"detail": "Cannot DM yourself."}, status=400)

        if not are_friends(request.user.id, friend_id):
            return Response({"detail": "You can only DM accepted friends."}, status=403)

        other = get_object_or_404(User, id=friend_id)
        conv, created = get_or_create_dm(request.user, other)

        return Response(
            {"conversation": ConversationSerializer(conv).data, "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ConversationMessagesView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs["conversation_id"]
        if not is_member(conversation_id, self.request.user.id):
            return Message.objects.none()

        qs = Message.objects.filter(conversation_id=conversation_id, thread_root__isnull=True)

        # pagination (cursor by id)
        before_id = self.request.query_params.get("before_id")
        if before_id:
            qs = qs.filter(id__lt=int(before_id))

        limit = int(self.request.query_params.get("limit", 30))
        limit = min(max(limit, 1), 100)

        # newest first, limit
        return qs.order_by("-id")[:limit]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = MessageSerializer(qs, many=True).data

        next_before_id = None
        if data:
            next_before_id = data[-1]["id"]

        return Response({"results": data, "next_before_id": next_before_id})

    def create(self, request, *args, **kwargs):
        conversation_id = self.kwargs["conversation_id"]
        if not is_member(conversation_id, request.user.id):
            return Response({"detail": "Forbidden"}, status=403)

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"detail": "content is required"}, status=400)

        msg = Message.objects.create(
            conversation_id=conversation_id,
            sender=request.user,
            content=content,
            thread_root=None,
        )
        return Response(MessageSerializer(msg).data, status=201)


class CreateThreadFromExistingMessageView(APIView):
    """
    POST /messages/{message_id}/threads/
    message_id phải là message MAIN (thread_root IS NULL)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        root = Message.objects.select_related("conversation").get(id=message_id)

        if root.thread_root_id is not None:
            return Response({"detail": "Cannot create thread from a thread reply."}, status=400)

        if not is_member(root.conversation_id, request.user.id):
            return Response({"detail": "Forbidden"}, status=403)

        # Thread id = root message id
        return Response({"thread_root_id": root.id}, status=200)


class CreateThreadWithNewTopicView(APIView):
    """
    POST /conversations/{conversation_id}/threads/
    body: { "title": "..." }
    -> tạo root message trong main chat
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        if not is_member(conversation_id, request.user.id):
            return Response({"detail": "Forbidden"}, status=403)

        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"detail": "title is required"}, status=400)

        root = Message.objects.create(
            conversation_id=conversation_id,
            sender=request.user,
            content=title,
            thread_root=None,
        )
        return Response({"thread_root_id": root.id}, status=201)


class ThreadMessagesView(ListCreateAPIView):
    """
    GET/POST /messages/{root_message_id}/threads/messages/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        root_id = self.kwargs["root_message_id"]
        root = Message.objects.select_related("conversation").get(id=root_id)

        if root.thread_root_id is not None:
            return Message.objects.none()

        if not is_member(root.conversation_id, self.request.user.id):
            return Message.objects.none()

        qs = Message.objects.filter(thread_root_id=root_id)

        before_id = self.request.query_params.get("before_id")
        if before_id:
            qs = qs.filter(id__lt=int(before_id))

        limit = int(self.request.query_params.get("limit", 50))
        limit = min(max(limit, 1), 200)

        return qs.order_by("-id")[:limit]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = MessageSerializer(qs, many=True).data

        next_before_id = None
        if data:
            next_before_id = data[-1]["id"]

        return Response({"results": data, "next_before_id": next_before_id})


    def create(self, request, *args, **kwargs):
        root_id = self.kwargs["root_message_id"]
        root = Message.objects.select_related("conversation").get(id=root_id)

        if root.thread_root_id is not None:
            return Response({"detail": "root_message_id must be a main message"}, status=400)

        if not is_member(root.conversation_id, request.user.id):
            return Response({"detail": "Forbidden"}, status=403)

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"detail": "content is required"}, status=400)

        msg = Message.objects.create(
            conversation=root.conversation,
            sender=request.user,
            content=content,
            thread_root=root,
        )
        return Response(MessageSerializer(msg).data, status=201)

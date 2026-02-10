from django.urls import path
from .views import (
    ConversationListView,
    CreateDMView,
    ConversationMessagesView,
    CreateThreadFromExistingMessageView,
    CreateThreadWithNewTopicView,
    ThreadMessagesView,
    MessageDeleteView,
)

urlpatterns = [
    path("conversations/", ConversationListView.as_view()),
    path("conversations/dm/", CreateDMView.as_view()),
    path("conversations/<int:conversation_id>/messages/", ConversationMessagesView.as_view()),
    path("messages/<int:message_id>/", MessageDeleteView.as_view()),
    path("conversations/<int:conversation_id>/threads/", CreateThreadWithNewTopicView.as_view()),
    path("messages/<int:message_id>/threads/", CreateThreadFromExistingMessageView.as_view()),
    path("messages/<int:root_message_id>/threads/messages/", ThreadMessagesView.as_view()),
]

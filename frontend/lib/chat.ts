import { apiFetch } from "@/lib/api";
import type { GetOrCreateDMResponse, PaginatedMessages, Message } from "@/lib/types";

export function getOrCreateDM(userId: number) {
  return apiFetch<GetOrCreateDMResponse>("/api/chat/conversations/dm/", {
    method: "POST",
    json: { user_id: userId }, // ✅ dùng json như apiFetch của bạn
  });
}

export function fetchConversationMessages(
  conversationId: number,
  params?: { limit?: number; beforeId?: number }
) {
  const sp = new URLSearchParams();
  sp.set("limit", String(params?.limit ?? 30));
  if (params?.beforeId) sp.set("before_id", String(params.beforeId));

  return apiFetch<PaginatedMessages>(
    `/api/chat/conversations/${conversationId}/messages/?${sp.toString()}`,
    { method: "GET" }
  );
}

export function sendConversationMessage(conversationId: number, content: string) {
  return apiFetch<Message>(`/api/chat/conversations/${conversationId}/messages/`, {
    method: "POST",
    json: { content },
  });
}

/** Thread */
export function createThreadFromMessage(messageId: number) {
  return apiFetch<{ thread_root_id: number }>(`/api/chat/messages/${messageId}/threads/`, {
    method: "POST",
  });
}

export function createThreadWithTopic(conversationId: number, title: string) {
  return apiFetch<{ thread_root_id: number }>(`/api/chat/conversations/${conversationId}/threads/`, {
    method: "POST",
    json: { title },
  });
}

export function fetchThreadMessages(rootMessageId: number, params?: { limit?: number; beforeId?: number }) {
  const sp = new URLSearchParams();
  sp.set("limit", String(params?.limit ?? 50));
  if (params?.beforeId) sp.set("before_id", String(params.beforeId));

  return apiFetch<PaginatedMessages>(
    `/api/chat/messages/${rootMessageId}/threads/messages/?${sp.toString()}`,
    { method: "GET" }
  );
}

export function sendThreadMessage(rootMessageId: number, content: string) {
  return apiFetch<Message>(`/api/chat/messages/${rootMessageId}/threads/messages/`, {
    method: "POST",
    json: { content },
  });
}

export function chatWsUrl(conversationId: number) {
  // dev local
  return `ws://localhost:8000/ws/chat/${conversationId}/`;
}

export function deleteMessage(messageId: number) {
  return apiFetch<{ id: number; deleted: boolean }>(`/api/chat/messages/${messageId}/`, {
    method: "DELETE",
  });
}

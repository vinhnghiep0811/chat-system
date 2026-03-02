"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { createThreadFromMessage, createThreadWithTopic, deleteMessage, fetchConversationMessages, sendConversationMessage } from "@/lib/chat";
import { chatWsUrl } from "@/lib/chat";
import ThreadPanel from "@/app/components/chat/ThreadPanel";

type Props = {
  myUserId: number;
  onSeen?: () => void;
  conversationId: number;
  title: string;
};

export default function ChatPanel({ onSeen, conversationId, title, myUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [ctx, setCtx] = useState<null | { x: number; y: number; message: Message }>(null);
  const [activeThreadRootId, setActiveThreadRootId] = useState<number | null>(null);
  const [incomingThreadMessage, setIncomingThreadMessage] = useState<Message | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loadMoreAnchorRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);

  const activeRootMessage =
    activeThreadRootId ? messages.find((m) => m.id === activeThreadRootId) ?? null : null;

  function sendSeen(ws: WebSocket, msgs: Message[]) {
  const lastReal = [...msgs].reverse().find((m) => m.id > 0);
  if (!lastReal) return false;

  ws.send(JSON.stringify({
    type: "read.seen",
    last_seen_message_id: lastReal.id,
  }));

  return true;
}

  useEffect(() => {
    function close() {
      setCtx(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  useEffect(() => {
    wsRef.current?.close();
    wsRef.current = null;

    const ws = new WebSocket(chatWsUrl(conversationId));
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "message.new") {
        const msg: Message = {
          id: data.message.id,
          sender_id: data.message.sender_id,
          content: data.message.content,
          created_at: data.message.created_at,
          thread_root: data.message.thread_root_id ?? null,
          thread_enable: data.message.thread_enable ?? false,
        };

        if (msg.thread_root === null) {
          setMessages((prev) => [...prev, msg]);
        } else {
          setIncomingThreadMessage(msg);
        }
      }

      if (data.type === "read.updated") {
        onSeen?.();
      }

      if (data.type === "message.deleted") {
        const id = Number(data.message_id);
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    };

    return () => {
      ws.close();
    };
  }, [conversationId, onSeen]);

  useEffect(() => {
  const ws = wsRef.current;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (!messages.length) return;

  const ok = sendSeen(ws, messages);
  if (ok) onSeen?.(); // ✅ refresh unread ngay
}, [messages, onSeen]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (loadMoreAnchorRef.current) {
      const { scrollTop, scrollHeight } = loadMoreAnchorRef.current;
      const heightDelta = el.scrollHeight - scrollHeight;
      el.scrollTop = scrollTop + heightDelta;
      loadMoreAnchorRef.current = null;
      return;
    }

    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function loadInitial() {
    setLoading(true);
    try {
      const res = await fetchConversationMessages(conversationId, { limit: 30 });
      setMessages([...res.results].reverse());
      setNextBeforeId(res.next_before_id);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateThreadFromMessage(messageId: number) {
    setCtx(null);
    await createThreadFromMessage(messageId);

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, thread_enable: true } : m))
    );

    setActiveThreadRootId(messageId);
    setIncomingThreadMessage(null);
  }

  async function onCreateNewThread() {
    const titleText = window.prompt("Enter thread title");
    const threadTitle = (titleText || "").trim();
    if (!threadTitle) return;

    const res = await createThreadWithTopic(conversationId, threadTitle);
    await loadInitial();
    setActiveThreadRootId(res.thread_root_id);
  }

  async function loadMore() {
    if (!nextBeforeId) return;
    const el = listRef.current;
    if (el) {
      loadMoreAnchorRef.current = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
    }
    setLoading(true);
    try {
      const res = await fetchConversationMessages(conversationId, {
        limit: 30,
        beforeId: nextBeforeId,
      });
      setMessages((prev) => [...[...res.results].reverse(), ...prev]);
      setNextBeforeId(res.next_before_id);
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    const content = text.trim();
    if (!content) return;
    setText("");
    stickToBottomRef.current = true;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const saved = await sendConversationMessage(conversationId, content);
      setMessages((prev) => [...prev, saved]);
      return;
    }

    ws.send(JSON.stringify({ type: "message.send", content }));
  }

  async function handleDelete(messageId: number) {
    setCtx(null);
    try {
      await deleteMessage(messageId);
    } catch (e) {
      console.error(e);
      await loadInitial();
    }
  }

  useEffect(() => {
    stickToBottomRef.current = true;
    loadInitial();
  }, [conversationId]);

  const ctxActions = (() => {
    if (!ctx) return { canShow: false, canCreate: false, canOpen: false, canDelete: false };

    const m = ctx.message;
    const canCreate = m.thread_root === null && !m.thread_enable && m.sender_id === myUserId;
    const canOpen = m.thread_root === null && m.thread_enable;
    const canDelete = m.sender_id === myUserId;
    const canShow = canCreate || canOpen || canDelete;

    return { canShow, canCreate, canOpen, canDelete };
  })();

  return (
    <div className="h-full flex gap-3">
      <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 font-semibold">{title}</div>

        <div
          className="flex-1 overflow-auto p-4 space-y-3"
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            stickToBottomRef.current = distanceToBottom < 80;
          }}
        >
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading || !nextBeforeId}
              className="text-xs text-slate-300 border border-slate-700 rounded-lg px-3 py-1 disabled:opacity-50"
            >
              {nextBeforeId ? (loading ? "Loading..." : "Load more") : "No more messages"}
            </button>
          </div>

          {(messages ?? []).map((m) => {
            const isMine = m.sender_id === myUserId;
            const isThreadMessage = m.thread_enable || m.thread_root !== null;

            return (
              <div
                key={m.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                onClick={() => {
                  if (m.thread_enable) {
                    setActiveThreadRootId(m.id);
                    setIncomingThreadMessage(null);
                  }
                }}
                onContextMenu={(e) => {
                  const canCreate = m.thread_root === null && !m.thread_enable && m.sender_id === myUserId;
                  const canOpen = m.thread_root === null && m.thread_enable;
                  const canDelete = m.sender_id === myUserId;
                  const canShow = canCreate || canOpen || canDelete;

                  if (!canShow) return;

                  e.preventDefault();
                  setCtx({ x: e.clientX, y: e.clientY, message: m });
                }}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 border ${
                    isMine
                      ? "bg-sky-600 text-white border-sky-500"
                      : "bg-slate-900/40 text-slate-100 border-slate-800"
                  } ${
                    isThreadMessage
                      ? isMine
                        ? "ring-2 ring-amber-300/80 shadow-lg shadow-amber-200/20"
                        : "border-amber-400/80 bg-amber-950/20 ring-1 ring-amber-400/50"
                      : ""
                  }`}
                >
                  {isThreadMessage && (
                    <div
                      className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isMine
                          ? "bg-amber-200 text-amber-900"
                          : "bg-amber-400/20 text-amber-300 border border-amber-400/50"
                      }`}
                    >
                      Thread
                    </div>
                  )}
                  <div className="text-sm break-words">{m.content}</div>
                  <div className={`text-[11px] mt-1 ${isMine ? "text-sky-100/80" : "text-slate-500"}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {ctx && ctxActions.canShow && (
          <div
            className="fixed z-50 min-w-[180px] rounded-xl border border-slate-700 bg-slate-950 shadow-xl overflow-hidden"
            style={{ left: ctx.x, top: ctx.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {ctxActions.canCreate && (
              <button
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => handleCreateThreadFromMessage(ctx.message.id)}
              >
                Create thread from this message
              </button>
            )}

            {ctxActions.canOpen && (
              <button
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setCtx(null);
                  setActiveThreadRootId(ctx.message.id);
                  setIncomingThreadMessage(null);
                }}
              >
                Open thread
              </button>
            )}

            {ctxActions.canDelete && (
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-slate-800"
                onClick={() => handleDelete(ctx.message.id)}
              >
                Delete
              </button>
            )}
          </div>
        )}

        <div className="p-3 border-t border-slate-800 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
          />
          <button onClick={onSend} className="rounded-xl bg-white text-black px-4 py-2 font-medium">
            Send
          </button>
        </div>
      </div>

      {activeRootMessage && (
        <ThreadPanel
          rootMessage={activeRootMessage}
          myUserId={myUserId}
          incomingMessage={incomingThreadMessage}
          onClose={() => {
            setActiveThreadRootId(null);
            setIncomingThreadMessage(null);
          }}
        />
      )}
    </div>
  );
}

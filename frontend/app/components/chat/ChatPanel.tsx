"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { fetchConversationMessages, sendConversationMessage } from "@/lib/chat";
import { chatWsUrl } from "@/lib/chat";

type Props = {
  onSeen?: () => void
  conversationId: number;
  title: string;
};

export default function ChatPanel({onSeen, conversationId, title }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  function sendSeen(ws: WebSocket, msgs: Message[]) {
    const lastReal = msgs.find((m) => m.id > 0); // bỏ optimistic id âm
    if (!lastReal) return;

    ws.send(JSON.stringify({
      type: "read.seen",
      last_seen_message_id: lastReal.id,
    }));
  }

  useEffect(() => {
    // đóng ws cũ
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
        };

        // bạn đang hiển thị newest-first => prepend
        setMessages((prev) => [msg, ...prev]);

        // đang mở conversation thì mark seen luôn
        try { sendSeen(ws, [msg, ...messages]); } catch { }
      }

      if (data.type === "connected") {
        // sau khi connect, mark seen theo message đang load
        // (đợi loadInitial chạy xong sẽ gọi thêm 1 lần ở effect khác)
      }
      if (data.type === "read.updated") {
        onSeen?.();
      }

    };

    ws.onclose = () => {
      // optional: console.log("ws closed");
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!messages.length) return;

    // gửi seen theo message mới nhất (id lớn nhất vì newest-first)
    sendSeen(ws, messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);


  async function loadInitial() {
    setLoading(true);
    try {
      const res = await fetchConversationMessages(conversationId, { limit: 30 });
      console.log("messages api res:", res);
      setMessages(res.results); // newest-first nếu backend đang trả newest-first
      setNextBeforeId(res.next_before_id);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextBeforeId) return;
    setLoading(true);
    try {
      const res = await fetchConversationMessages(conversationId, { limit: 30, beforeId: nextBeforeId });
      setMessages((prev) => [...prev, ...res.results]);
      setNextBeforeId(res.next_before_id);
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    const content = text.trim();
    if (!content) return;
    setText("");

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // fallback: nếu ws chưa mở, dùng REST như cũ
      const saved = await sendConversationMessage(conversationId, content);
      setMessages((prev) => [saved, ...prev]);
      return;
    }

    ws.send(JSON.stringify({ type: "message.send", content }));
  }


  useEffect(() => {
    loadInitial();
  }, [conversationId]);

  return (
    <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/30 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 font-semibold">{title}</div>

      <div className="flex-1 overflow-auto p-4 space-y-2" ref={listRef}>
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading || !nextBeforeId}
            className="text-xs text-slate-300 border border-slate-700 rounded-lg px-3 py-1 disabled:opacity-50"
          >
            {nextBeforeId ? (loading ? "Đang tải..." : "Tải thêm") : "Hết tin nhắn"}
          </button>
        </div>

        {(messages ?? []).map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
            <div className="text-sm text-slate-100">{m.content}</div>
            <div className="text-[11px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
          placeholder="Nhập tin nhắn..."
          className="flex-1 rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
        />
        <button
          onClick={onSend}
          className="rounded-xl bg-white text-black px-4 py-2 font-medium"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

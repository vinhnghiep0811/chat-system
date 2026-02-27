"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { fetchThreadMessages, sendThreadMessage } from "@/lib/chat";

type Props = {
  rootMessage: Message;
  myUserId: number;
  onClose: () => void;
  incomingMessage?: Message | null;
};

export default function ThreadPanel({ rootMessage, myUserId, onClose, incomingMessage }: Props) {
  const rootId = rootMessage.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loadMoreAnchorRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);

  async function loadInitial() {
    setLoading(true);
    try {
      const res = await fetchThreadMessages(rootId, { limit: 30 });
      setMessages([...res.results].reverse()); // oldest -> newest
      setNextBeforeId(res.next_before_id);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextBeforeId) return;
    const el = listRef.current;
    if (el) {
      loadMoreAnchorRef.current = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
    }
    setLoading(true);
    try {
      const res = await fetchThreadMessages(rootId, { limit: 30, beforeId: nextBeforeId });
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

    const saved = await sendThreadMessage(rootId, content);
    setMessages((prev) => [...prev, saved]);
  }

  useEffect(() => {
    if (!incomingMessage) return;
    if (incomingMessage.thread_root !== rootId) return;
    setMessages((prev) => [...prev, incomingMessage]);
  }, [incomingMessage, rootId]);

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

  useEffect(() => {
    stickToBottomRef.current = true;
    loadInitial();
  }, [rootId]);

  const isRootMine = rootMessage.sender_id === myUserId;

  return (
    <div className="w-[360px] h-full border-l border-slate-800 bg-slate-950/40 flex flex-col overflow-hidden rounded-2xl">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="font-semibold">Thread</div>
        <button className="text-sm text-slate-300 hover:text-white" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="p-3 border-b border-slate-800">
        <div className="text-xs text-slate-400 mb-1">Root message</div>
        <div className={`flex ${isRootMine ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-3 py-2 border ${
              isRootMine
                ? "bg-sky-600 text-white border-sky-500"
                : "bg-slate-900/40 text-slate-100 border-slate-800"
            }`}
          >
            <div className="text-sm break-words">{rootMessage.content}</div>
            <div className={`text-[11px] mt-1 ${isRootMine ? "text-sky-100/80" : "text-slate-500"}`}>
              {new Date(rootMessage.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto p-3 space-y-3"
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
            {nextBeforeId ? (loading ? "Loading..." : "Load more") : "No more replies"}
          </button>
        </div>

        {messages.map((m) => {
          const isMine = m.sender_id === myUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 border ${
                  isMine
                    ? "bg-sky-600 text-white border-sky-500"
                    : "bg-slate-900/40 text-slate-100 border-slate-800"
                }`}
              >
                <div className="text-sm break-words">{m.content}</div>
                <div className={`text-[11px] mt-1 ${isMine ? "text-sky-100/80" : "text-slate-500"}`}>
                  {isMine ? "You" : `User ${m.sender_id}`} - {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
          placeholder="Reply in thread..."
          className="flex-1 rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
        />
        <button onClick={onSend} className="rounded-xl bg-white text-black px-4 py-2 font-medium">
          Send
        </button>
      </div>
    </div>
  );
}

"use client";

import FriendsPanel from "@/app/components/friends/FriendsPanel";
import ChatPanel from "@/app/components/chat/ChatPanel";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export default function FriendsPage() {
  const [meId, setMeId] = useState<number | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeFriend, setActiveFriend] = useState<{ id: number; username: string } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const handleSeen = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);
  useEffect(() => {
    apiFetch<{ id: number }>("/api/users/me/", { method: "GET" })
      .then((me) => setMeId(me.id))
      .catch(() => setMeId(null));
  }, []);

  return (
    <div className="h-full flex">
      <section className="w-[360px] border-r border-slate-800">
        <FriendsPanel
          meId={meId}
          refreshKey={refreshKey}
          onSelectFriend={(f) => {
            setActiveFriend({ id: f.id, username: f.username });
          }}
          onConversationReady={(conversationId) => setActiveConversationId(conversationId)}
        />
      </section>

      <section className="flex-1 p-6">
        {activeConversationId && activeFriend && meId ? (
          <ChatPanel
            myUserId={meId}
            conversationId={activeConversationId}
            title={activeFriend.username}
            onSeen={handleSeen} // Refresh unread count in sidebar after seen.
          />
        ) : (
          <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/30 grid place-items-center">
            <div className="text-slate-300">Select a friend to start chatting</div>
          </div>
        )}
      </section>
    </div>
  );
}

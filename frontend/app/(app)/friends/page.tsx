"use client";

import FriendsPanel from "@/app/components/friends/FriendsPanel";
import ChatPanel from "@/app/components/chat/ChatPanel";
import { useState } from "react";

export default function FriendsPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeFriend, setActiveFriend] = useState<{ id: number; username: string } | null>(null);

  return (
    <div className="h-full flex">
      <section className="w-[360px] border-r border-slate-800">
        <FriendsPanel
          onSelectFriend={(f) => {
            setActiveFriend({ id: f.id, username: f.username });
            // conversationId sẽ set ở FriendsPanel sau khi gọi API
          }}
          onConversationReady={(conversationId) => setActiveConversationId(conversationId)}
        />
      </section>

      <section className="flex-1 p-6">
        {activeConversationId && activeFriend ? (
          <ChatPanel conversationId={activeConversationId} title={activeFriend.username} />
        ) : (
          <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/30 grid place-items-center">
            <div className="text-slate-300">Chọn một người bạn để bắt đầu chat</div>
          </div>
        )}
      </section>
    </div>
  );
}

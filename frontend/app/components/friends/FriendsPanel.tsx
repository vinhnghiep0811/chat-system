"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Friend, FriendRequest } from "@/lib/types";
import AddFriendModal from "./AddFriendModel";
import FriendRequestsModal from "./FriendRequestsModel";
import { getOrCreateDM } from "@/lib/chat";

type Props = {
  onSelectFriend?: (f: Friend) => void;
  onConversationReady?: (conversationId: number) => void;
};

export default function FriendsPanel({ onSelectFriend, onConversationReady }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openReq, setOpenReq] = useState(false);

  const pendingCount = useMemo(
    () => incoming.filter((r) => r.status === "PENDING").length,
    [incoming]
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [f, req] = await Promise.all([
        apiFetch<Friend[]>("/api/friends/", { method: "GET" }),
        apiFetch<FriendRequest[]>("/api/friends/requests/incoming/", { method: "GET" }),
      ]);
      setFriends(f);
      setIncoming(req);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleClickFriend(f: Friend) {
    onSelectFriend?.(f);
    // gọi backend lấy conversation id
    const res = await getOrCreateDM(f.id);
    onConversationReady?.(res.conversation.id);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="font-semibold">Friends</div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenAdd(true)}
            className="rounded-lg bg-white text-black px-3 py-1.5 text-sm font-medium"
          >
            + Kết bạn
          </button>

          <button
            onClick={() => setOpenReq(true)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
          >
            Lời mời {pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="text-slate-300 text-sm">Đang tải...</div>
        ) : friends.length === 0 ? (
          <div className="text-slate-300 text-sm">Chưa có bạn bè.</div>
        ) : (
          <ul className="space-y-2">
            {friends.map((u) => (
              <li
                key={u.id}
                onClick={() => handleClickFriend(u)}
                className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 hover:bg-slate-900"
              >
                <div className="font-medium">{u.username}</div>
                <div className="text-xs text-slate-400">{u.email}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddFriendModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSent={async () => {
          setOpenAdd(false);
          await loadAll();
        }}
      />

      <FriendRequestsModal
        open={openReq}
        onClose={() => setOpenReq(false)}
        requests={incoming}
        onChanged={async () => {
          await loadAll();
        }}
      />
    </div>
  );
}

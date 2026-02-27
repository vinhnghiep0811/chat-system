"use client";

import { apiFetch } from "@/lib/api";
import type { FriendRequest } from "@/lib/types";
import { useMemo, useState } from "react";

export default function FriendRequestsModal({
  open,
  onClose,
  requests,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  requests: FriendRequest[];
  onChanged: () => void;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const pending = useMemo(
    () => requests.filter((r) => r.status === "PENDING"),
    [requests]
  );

  if (!open) return null;

  const accept = async (id: number) => {
    setLoadingId(id);
    try {
      await apiFetch(`/api/friends/requests/${id}/accept/`, { method: "POST" });
      await onChanged();
    } finally {
      setLoadingId(null);
    }
  };

  const reject = async (id: number) => {
    setLoadingId(id);
    try {
      // Nếu backend bạn không có reject endpoint như thế này, đổi lại đúng URL.
      await apiFetch(`/api/friends/requests/${id}/reject/`, { method: "POST" });
      await onChanged();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Friend Requests</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4">
          {pending.length === 0 ? (
            <div className="text-sm text-slate-300">No requests.</div>
          ) : (
            <ul className="space-y-2">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{r.from_user.username}</div>
                    <div className="text-xs text-slate-400">{r.from_user.email}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={loadingId === r.id}
                      onClick={() => reject(r.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm disabled:opacity-60"
                    >
                      Decline
                    </button>
                    <button
                      disabled={loadingId === r.id}
                      onClick={() => accept(r.id)}
                      className="rounded-lg bg-white text-black px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                    >
                      {loadingId === r.id ? "..." : "Accept"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

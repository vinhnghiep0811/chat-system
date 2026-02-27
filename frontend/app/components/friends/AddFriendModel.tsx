"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AddFriendModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await apiFetch("/api/friends/requests/", {
        method: "POST",
        json: { identifier },
      });
      setMsg("Friend request sent!");
      setIdentifier("");
      onSent();
    } catch (e: any) {
      setMsg(e?.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Add Friend</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm text-slate-300">Enter username or email:</div>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 outline-none"
            placeholder="e.g. lvn3 or abc@gmail.com"
          />
          {msg && <div className="text-sm text-slate-300">{msg}</div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2">
            Cancel
          </button>
          <button
            disabled={loading || !identifier.trim()}
            onClick={submit}
            className="rounded-lg bg-white text-black px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

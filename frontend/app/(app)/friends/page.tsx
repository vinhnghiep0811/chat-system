import FriendsPanel from "@/app/components/friends/FriendsPanel";

export default function FriendsPage() {
  return (
    <div className="h-full flex">
      {/* Middle: friends list */}
      <section className="w-[360px] border-r border-slate-800">
        <FriendsPanel />
      </section>

      {/* Right: chat placeholder */}
      <section className="flex-1 p-6">
        <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/30 grid place-items-center">
          <div className="text-slate-300">Chat panel (sẽ làm sau)</div>
        </div>
      </section>
    </div>
  );
}

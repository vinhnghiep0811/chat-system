import Sidebar from "../components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex bg-slate-950 text-white">
      <aside className="w-64 border-r border-slate-800">
        <Sidebar />
      </aside>
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}

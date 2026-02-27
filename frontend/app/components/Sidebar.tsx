"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const nav = [
  { href: "/friends", label: "Friends" },
  // { href: "/groups", label: "Group" },
  { href: "/profile", label: "Profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = async () => {
    try {
      await apiFetch("/api/users/logout/", { method: "POST" });
    } finally {
      router.replace("/auth/login");
      router.refresh();
    }
  };

  return (
    <div className="h-full p-4 flex flex-col gap-3">
      <div className="text-lg font-bold">Chat System</div>

      <nav className="mt-2 space-y-2">
        {nav.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "block rounded-lg px-3 py-2",
                active ? "bg-slate-800" : "hover:bg-slate-900",
              ].join(" ")}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-3 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full rounded-lg border border-slate-700 px-3 py-2 text-left hover:bg-slate-900"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

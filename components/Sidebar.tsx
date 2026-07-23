"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { NavGroup } from "@/lib/navigation";

function initialOf(nameOrEmail: string) {
  return nameOrEmail.trim().charAt(0).toUpperCase() || "?";
}

export default function Sidebar({
  roleLabel,
  groups,
}: {
  roleLabel: string;
  groups: NavGroup[];
}) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const displayName = profile?.name || profile?.email || "";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">School ERP</p>
          <p className="truncate text-xs text-gray-500">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group, i) => (
          <div key={group.label ?? `group-${i}`}>
            {group.label && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500">
          <Bell className="h-4 w-4 shrink-0 text-gray-400" />
          <span>Notifications</span>
        </div>

        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {initialOf(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{profile?.name || "—"}</p>
            <p className="truncate text-xs text-gray-500">{profile?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            aria-label="Log out"
            title="Log out"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

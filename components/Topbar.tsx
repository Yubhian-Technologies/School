"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function initialOf(nameOrEmail: string) {
  return nameOrEmail.trim().charAt(0).toUpperCase() || "?";
}

export default function Topbar() {
  const { profile } = useAuth();
  const displayName = profile?.name || profile?.email || "";

  return (
    <header className="flex items-center justify-end gap-4 border-b border-gray-100 bg-white px-8 py-4">
      <button
        aria-label="Notifications"
        title="Notifications"
        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
      >
        <Bell className="h-5 w-5" />
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
        {initialOf(displayName)}
      </div>
    </header>
  );
}

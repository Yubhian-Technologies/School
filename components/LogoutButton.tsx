"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
    >
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  );
}

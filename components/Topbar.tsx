"use client";

import { useAuth } from "@/context/AuthContext";
import LogoutButton from "@/components/LogoutButton";

export default function Topbar({ heading }: { heading: string }) {
  const { profile } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <p className="text-sm font-semibold text-gray-700">{heading}</p>
      <div className="flex items-center gap-4">
        {profile?.email && (
          <span className="text-sm text-gray-500">{profile.email}</span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}

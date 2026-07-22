"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "@/components/LogoutButton";
import { subscribeToSchool } from "@/lib/schools";

export default function Topbar({ heading }: { heading: string }) {
  const { profile } = useAuth();
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;
    return subscribeToSchool(profile.schoolId, (school) => {
      setSchoolName(school?.name ?? null);
    });
  }, [profile?.schoolId]);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <p className="text-sm font-semibold text-gray-700">{schoolName ?? heading}</p>
      <div className="flex items-center gap-4">
        {profile?.email && (
          <span className="text-sm text-gray-500">{profile.email}</span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}

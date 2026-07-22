"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@/lib/types";

export default function RoleGuard({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const authorized = !loading && !!user && profile?.role === role;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!profile || profile.role !== role) {
      router.replace(profile ? ROLE_HOME[profile.role] : "/login");
    }
  }, [loading, user, profile, role, router]);

  if (!authorized) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}

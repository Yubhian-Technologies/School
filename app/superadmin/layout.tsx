"use client";

import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { SUPERADMIN_NAV } from "@/lib/navigation";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="superadmin">
      <div className="flex flex-1">
        <Sidebar roleLabel="Super Admin" groups={SUPERADMIN_NAV} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-gray-50 p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

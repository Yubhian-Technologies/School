"use client";

import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { ADMIN_NAV } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="admin">
      <div className="flex flex-1">
        <Sidebar roleLabel="School Admin" groups={ADMIN_NAV} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-gray-50 p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

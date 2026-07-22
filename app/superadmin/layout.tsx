import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { SUPERADMIN_NAV } from "@/lib/navigation";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="superadmin">
      <div className="flex flex-1">
        <Sidebar title="Super Admin" items={SUPERADMIN_NAV} badge="Platform" />
        <div className="flex flex-1 flex-col">
          <Topbar heading="Platform Administration" />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

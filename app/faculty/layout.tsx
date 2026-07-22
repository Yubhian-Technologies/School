import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { FACULTY_NAV } from "@/lib/navigation";

export default function FacultyLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="faculty">
      <div className="flex flex-1">
        <Sidebar title="Faculty" items={FACULTY_NAV} />
        <div className="flex flex-1 flex-col">
          <Topbar heading="Faculty Portal" />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

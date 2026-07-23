"use client";

import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { FACULTY_NAV } from "@/lib/navigation";

export default function FacultyLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="faculty">
      <div className="flex flex-1">
        <Sidebar roleLabel="Faculty" groups={FACULTY_NAV} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-gray-50 p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

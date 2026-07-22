import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import TopNav from "@/components/TopNav";
import Topbar from "@/components/Topbar";
import { PARENT_NAV } from "@/lib/navigation";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="parent">
      <div className="flex flex-1 flex-col">
        <Topbar heading="Parent Portal" />
        <TopNav items={PARENT_NAV} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </RoleGuard>
  );
}

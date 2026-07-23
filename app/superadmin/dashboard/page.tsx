"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, UserCog } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DashboardCard, { DashboardSection } from "@/components/DashboardCard";
import { subscribeToSchools } from "@/lib/schools";
import { subscribeToAdmins } from "@/lib/admins";
import type { School, UserProfile } from "@/lib/types";

export default function SuperAdminDashboardPage() {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<School[] | null>(null);
  const [admins, setAdmins] = useState<UserProfile[] | null>(null);

  useEffect(() => subscribeToSchools(setSchools), []);
  useEffect(() => subscribeToAdmins(setAdmins), []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${profile?.name || "Super Admin"}`}
        subtitle="Platform-wide oversight of every school on School ERP"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={GraduationCap}
          label="Schools"
          value={schools === null ? "—" : schools.length}
          color="indigo"
          href="/superadmin/schools"
        />
        <StatCard
          icon={UserCog}
          label="Admins"
          value={admins === null ? "—" : admins.length}
          color="purple"
          href="/superadmin/admins"
        />
      </div>

      <DashboardSection label="Platform">
        <DashboardCard
          icon={GraduationCap}
          title="Schools"
          subtitle="Create and manage schools"
          href="/superadmin/schools"
          color="indigo"
        />
        <DashboardCard
          icon={UserCog}
          title="Admins"
          subtitle="Create admin logins"
          href="/superadmin/admins"
          color="purple"
        />
      </DashboardSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900">Recent schools</p>
            <Link href="/superadmin/schools" className="text-xs font-medium text-indigo-600">
              View all
            </Link>
          </div>
          {schools === null ? (
            <p className="p-8 text-center text-sm text-gray-500">Loading…</p>
          ) : schools.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No schools yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {schools.slice(0, 5).map((school) => (
                <li key={school.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-gray-900">{school.name}</p>
                  <p className="text-gray-500">{school.place}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900">Recent admins</p>
            <Link href="/superadmin/admins" className="text-xs font-medium text-indigo-600">
              View all
            </Link>
          </div>
          {admins === null ? (
            <p className="p-8 text-center text-sm text-gray-500">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No admins yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {admins.slice(0, 5).map((admin) => (
                <li key={admin.uid} className="px-5 py-3 text-sm">
                  <p className="font-medium text-gray-900">{admin.name ?? admin.email}</p>
                  <p className="text-gray-500">{admin.email}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

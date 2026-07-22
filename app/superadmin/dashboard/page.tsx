"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeToSchools } from "@/lib/schools";
import { subscribeToAdmins } from "@/lib/admins";
import type { School, UserProfile } from "@/lib/types";

export default function SuperAdminDashboardPage() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [admins, setAdmins] = useState<UserProfile[] | null>(null);

  useEffect(() => subscribeToSchools(setSchools), []);
  useEffect(() => subscribeToAdmins(setAdmins), []);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">
        Super Admin Dashboard
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/superadmin/schools"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-indigo-200"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Schools</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {schools === null ? "—" : schools.length}
          </p>
        </Link>

        <Link
          href="/superadmin/admins"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-indigo-200"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Admins</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {admins === null ? "—" : admins.length}
          </p>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">Recent schools</p>
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
                <li key={school.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-gray-900">{school.name}</p>
                  <p className="text-gray-500">{school.place}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">Recent admins</p>
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
                <li key={admin.uid} className="px-4 py-3 text-sm">
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

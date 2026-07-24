"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  computeAttendancePercent,
  getTodayDateString,
  subscribeToAttendanceHistory,
  subscribeToAttendanceSummary,
} from "@/lib/attendance";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import type { AttendanceSummary, ClassSection } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}

export default function ClassAttendancePage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const today = getTodayDateString();

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [todaySummary, setTodaySummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [history, setHistory] = useState<AttendanceSummary[] | null>(null);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, today, setTodaySummary);
  }, [mySection, today]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceHistory(mySection.id, setHistory);
  }, [mySection]);

  if (mySection === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (mySection === null) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Attendance</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            You haven&apos;t been assigned as a Class Teacher yet. Ask your Admin to assign you to a
            class &amp; section under Admin · Classes.
          </p>
        </div>
      </div>
    );
  }

  const pastHistory = (history ?? []).filter((h) => h.date !== today);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">
            {mySection.className} — Section {mySection.sectionName}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Today — {formatDate(today)}</p>
            {todaySummary && todaySummary.submittedAt && (
              <p className="mt-0.5 text-xs text-gray-500">
                Submitted at{" "}
                {new Date(todaySummary.submittedAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          {todaySummary === null && (
            <Link
              href={`/faculty/class/${DEMO_CLASS_ID}/attendance/take`}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Take Attendance
            </Link>
          )}
        </div>

        {todaySummary === undefined ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : todaySummary === null ? (
          <p className="mt-4 text-sm text-gray-500">
            Today&apos;s attendance hasn&apos;t been taken yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatBadge label="Present" value={todaySummary.presentCount} />
            <StatBadge label="Absent" value={todaySummary.absentCount} />
            <StatBadge label="Half Day" value={todaySummary.halfDayCount} />
            <StatBadge label="Total" value={todaySummary.totalStudents} />
            <StatBadge label="Attendance %" value={`${computeAttendancePercent(todaySummary)}%`} />
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">History</h2>
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {history === null ? (
            <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
          ) : pastHistory.length === 0 ? (
            <p className="p-16 text-center text-sm text-gray-500">
              No past attendance records yet.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Present</th>
                  <th className="px-4 py-3">Absent</th>
                  <th className="px-4 py-3">Half Day</th>
                  <th className="px-4 py-3">Attendance %</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pastHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatDate(h.date)}</td>
                    <td className="px-4 py-3 text-gray-600">{h.presentCount}</td>
                    <td className="px-4 py-3 text-gray-600">{h.absentCount}</td>
                    <td className="px-4 py-3 text-gray-600">{h.halfDayCount}</td>
                    <td className="px-4 py-3 text-gray-600">{computeAttendancePercent(h)}%</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/faculty/class/${DEMO_CLASS_ID}/attendance/${h.date}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

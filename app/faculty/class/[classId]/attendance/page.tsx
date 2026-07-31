"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  computeDayAttendancePercent,
  computeSessionAttendancePercent,
  getTodayDateString,
  subscribeToAttendanceHistory,
  subscribeToAttendanceSummary,
} from "@/lib/attendance";
import { isDefaultHoliday, isSessionCancelled, subscribeToHoliday } from "@/lib/holidays";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import type { AttendanceSummary, ClassSection, Holiday } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SessionStatus({
  label,
  summary,
  cancelled,
  reason,
}: {
  label: string;
  summary: AttendanceSummary | null | undefined;
  cancelled: boolean;
  reason?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      {summary === undefined ? (
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      ) : cancelled ? (
        <div className="mt-2 flex items-start gap-2 text-amber-700">
          <CalendarOff className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">Holiday{reason ? ` — ${reason}` : ""}</p>
        </div>
      ) : summary === null ? (
        <p className="mt-2 text-sm text-gray-500">Not taken yet.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-gray-900">{summary.presentCount}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Present</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{summary.absentCount}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Absent</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {computeSessionAttendancePercent(summary)}%
            </p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Attendance</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface DayRow {
  date: string;
  morning?: AttendanceSummary;
  afternoon?: AttendanceSummary;
}

export default function ClassAttendancePage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const today = getTodayDateString();

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [morningSummary, setMorningSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [afternoonSummary, setAfternoonSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [holiday, setHoliday] = useState<Holiday | null | undefined>(undefined);
  const [history, setHistory] = useState<AttendanceSummary[] | null>(null);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, today, "MORNING", setMorningSummary);
  }, [mySection, today]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, today, "AFTERNOON", setAfternoonSummary);
  }, [mySection, today]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToHoliday(schoolId, today, setHoliday);
  }, [schoolId, today]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceHistory(mySection.id, setHistory);
  }, [mySection]);

  const dayRows = useMemo(() => {
    const map = new Map<string, DayRow>();
    for (const s of history ?? []) {
      const row = map.get(s.date) ?? { date: s.date };
      if (s.session === "MORNING") row.morning = s;
      else row.afternoon = s;
      map.set(s.date, row);
    }
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [history]);

  const pastDayRows = dayRows.filter((d) => d.date !== today);

  const morningCancelled = isSessionCancelled(today, holiday, "MORNING");
  const afternoonCancelled = isSessionCancelled(today, holiday, "AFTERNOON");
  const bothResolvedToday =
    (Boolean(morningSummary) || morningCancelled) && (Boolean(afternoonSummary) || afternoonCancelled);
  const holidayReason = holiday?.reason ?? (isDefaultHoliday(today) ? "Sunday" : undefined);

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
          <p className="text-sm font-semibold text-gray-900">Today — {formatDate(today)}</p>
          {!bothResolvedToday && (
            <Link
              href={`/faculty/class/${DEMO_CLASS_ID}/attendance/take`}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Take Attendance
            </Link>
          )}
        </div>

        {(morningCancelled || afternoonCancelled) && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <CalendarOff className="h-4 w-4 shrink-0" />
            <span>
              {morningCancelled && afternoonCancelled
                ? "Today is a holiday"
                : `Today's ${morningCancelled ? "Morning" : "Afternoon"} session is cancelled (half day)`}
              {holidayReason ? ` — ${holidayReason}` : ""}. Declared by your school&apos;s Admin under
              Holidays.
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SessionStatus
            label="Morning"
            summary={morningSummary}
            cancelled={morningCancelled}
            reason={holidayReason}
          />
          <SessionStatus
            label="Afternoon"
            summary={afternoonSummary}
            cancelled={afternoonCancelled}
            reason={holidayReason}
          />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">History</h2>
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {history === null ? (
            <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
          ) : pastDayRows.length === 0 ? (
            <p className="p-16 text-center text-sm text-gray-500">
              No past attendance records yet.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Morning</th>
                  <th className="px-4 py-3">Afternoon</th>
                  <th className="px-4 py-3">Attendance %</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pastDayRows.map((d) => (
                  <tr key={d.date}>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatDate(d.date)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.morning
                        ? `${d.morning.presentCount} present, ${d.morning.absentCount} absent`
                        : "Not taken"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.afternoon
                        ? `${d.afternoon.presentCount} present, ${d.afternoon.absentCount} absent`
                        : "Not taken"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {computeDayAttendancePercent(d.morning, d.afternoon)}%
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/faculty/class/${DEMO_CLASS_ID}/attendance/${d.date}`}
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

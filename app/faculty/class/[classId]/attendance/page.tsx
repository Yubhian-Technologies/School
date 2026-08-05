"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  computeSessionAttendancePercent,
  getTodayDateString,
  subscribeToAttendanceHistory,
  subscribeToAttendanceSummary,
} from "@/lib/attendance";
import { isDefaultHoliday, isSessionCancelled, subscribeToHoliday, subscribeToHolidaysForRange } from "@/lib/holidays";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import type { AttendanceSummary, ClassSection, Holiday } from "@/lib/types";
import AttendanceMonthTable, {
  buildMonthHistoryRows,
  formatDate,
  monthBounds,
  MonthYearPicker,
} from "@/components/attendance/AttendanceMonthTable";

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
            <p className="text-lg font-bold text-gray-900">{computeSessionAttendancePercent(summary)}%</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Attendance</p>
          </div>
        </div>
      )}
    </div>
  );
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

  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthHolidays, setMonthHolidays] = useState<Holiday[] | null>(null);
  const { start: monthStart, end: monthEnd } = monthBounds(historyMonth.year, historyMonth.month);

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
    return subscribeToAttendanceHistory(mySection.schoolId, mySection.id, setHistory);
  }, [mySection]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToHolidaysForRange(schoolId, monthStart, monthEnd, setMonthHolidays);
  }, [schoolId, monthStart, monthEnd]);

  // Excludes today (shown separately in the card above) as well as future days.
  const historyRows = useMemo(
    () =>
      buildMonthHistoryRows({
        year: historyMonth.year,
        month: historyMonth.month,
        excludeFrom: today,
        history: history ?? [],
        monthHolidays: monthHolidays ?? [],
      }),
    [historyMonth, today, history, monthHolidays]
  );

  const historyLoading = history === null || monthHolidays === null;

  const morningCancelled = isSessionCancelled(today, holiday, "MORNING");
  const afternoonCancelled = isSessionCancelled(today, holiday, "AFTERNOON");
  const bothCancelledToday = morningCancelled && afternoonCancelled;
  // Submitted sessions are editable now (not locked), so the link into Take
  // Attendance stays available even once both sessions have a summary — it
  // only ever disappears when today is a full holiday and there's nothing
  // to take or edit.
  const alreadyTakenToday = Boolean(morningSummary) || Boolean(afternoonSummary);
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
          {!bothCancelledToday && (
            <Link
              href={`/faculty/class/${DEMO_CLASS_ID}/attendance/take`}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              {alreadyTakenToday ? "Edit Attendance" : "Take Attendance"}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
          <MonthYearPicker month={historyMonth.month} year={historyMonth.year} onChange={setHistoryMonth} />
        </div>
        <div className="mt-2">
          <AttendanceMonthTable
            rows={historyRows}
            loading={historyLoading}
            renderActions={(d) => (
              <div className="flex gap-3">
                {(d.morning || d.afternoon) && (
                  <Link
                    href={`/faculty/class/${DEMO_CLASS_ID}/attendance/${d.date}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View
                  </Link>
                )}
                <Link
                  href={`/faculty/class/${DEMO_CLASS_ID}/attendance/take?date=${d.date}`}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {d.morning || d.afternoon ? "Edit" : "Take"}
                </Link>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}

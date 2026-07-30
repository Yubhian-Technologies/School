"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarOff } from "lucide-react";
import Modal from "@/components/Modal";
import { ToastStack, useToastStack } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  computeDayAttendancePercent,
  computeSessionAttendancePercent,
  getTodayDateString,
  subscribeToAttendanceHistory,
  subscribeToAttendanceSummary,
} from "@/lib/attendance";
import {
  declareHoliday,
  isSessionCancelled,
  subscribeToHoliday,
  undoHolidayDeclaration,
} from "@/lib/attendanceHolidays";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import type { AttendanceHoliday, AttendanceSession, AttendanceSummary, ClassSection, HolidayType } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

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
  const [holiday, setHoliday] = useState<AttendanceHoliday | null | undefined>(undefined);
  const [history, setHistory] = useState<AttendanceSummary[] | null>(null);

  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayType, setHolidayType] = useState<HolidayType>("FULL_DAY");
  const [cancelledSession, setCancelledSession] = useState<AttendanceSession>("AFTERNOON");
  const [reason, setReason] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  const { toasts, show, dismiss } = useToastStack();

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
    if (!mySection) return;
    return subscribeToHoliday(mySection.id, today, setHoliday);
  }, [mySection, today]);

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

  const morningCancelled = isSessionCancelled(holiday, "MORNING");
  const afternoonCancelled = isSessionCancelled(holiday, "AFTERNOON");
  const morningResolved = Boolean(morningSummary) || morningCancelled;
  const afternoonResolved = Boolean(afternoonSummary) || afternoonCancelled;
  const bothResolvedToday = morningResolved && afternoonResolved;
  // A Full-Day declaration would contradict a session that's already been
  // genuinely submitted or already cancelled — only offer it when neither
  // session has been resolved yet.
  const canFullDay = !morningResolved && !afternoonResolved;

  function openHolidayModal() {
    setHolidayType(canFullDay ? "FULL_DAY" : "HALF_DAY");
    setCancelledSession(!morningResolved ? "MORNING" : "AFTERNOON");
    setReason("");
    setHolidayError(null);
    setHolidayModalOpen(true);
  }

  async function handleDeclareHoliday() {
    if (!schoolId || !mySection || !user) return;
    if (holidayType === "FULL_DAY" && !canFullDay) {
      setHolidayError("A session today has already been taken or cancelled — choose Half Day instead.");
      return;
    }
    if (holidayType === "HALF_DAY" && (cancelledSession === "MORNING" ? morningResolved : afternoonResolved)) {
      setHolidayError("That session has already been taken or cancelled.");
      return;
    }
    setHolidayError(null);
    setSavingHoliday(true);
    try {
      if (holiday) {
        await undoHolidayDeclaration(mySection.id, today);
      }
      await declareHoliday({
        schoolId,
        classSectionId: mySection.id,
        date: today,
        type: holidayType,
        cancelledSession: holidayType === "HALF_DAY" ? cancelledSession : undefined,
        reason,
        markedByUid: user.uid,
      });
      show("Holiday recorded — attendance won't be required for today.");
      setHolidayModalOpen(false);
    } catch (err) {
      setHolidayError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setSavingHoliday(false);
    }
  }

  async function handleUndoHoliday() {
    if (!mySection) return;
    try {
      await undoHolidayDeclaration(mySection.id, today);
      show("Holiday undone.");
    } catch {
      show("Could not undo. Please try again.", "error");
    }
  }

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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openHolidayModal}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <CalendarOff className="h-4 w-4" />
                Mark Holiday / Half Day
              </button>
              <Link
                href={`/faculty/class/${DEMO_CLASS_ID}/attendance/take`}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Take Attendance
              </Link>
            </div>
          )}
        </div>

        {holiday && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>
              {holiday.type === "FULL_DAY"
                ? "Today is marked a full-day holiday."
                : `Today's ${holiday.cancelledSession === "MORNING" ? "Morning" : "Afternoon"} session is cancelled (half day).`}
              {holiday.reason ? ` — ${holiday.reason}` : ""}
            </span>
            <button
              onClick={handleUndoHoliday}
              className="ml-3 shrink-0 font-semibold text-amber-900 underline hover:text-amber-700"
            >
              Undo
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SessionStatus
            label="Morning"
            summary={morningSummary}
            cancelled={morningCancelled}
            reason={holiday?.reason}
          />
          <SessionStatus
            label="Afternoon"
            summary={afternoonSummary}
            cancelled={afternoonCancelled}
            reason={holiday?.reason}
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

      {holidayModalOpen && (
        <Modal title="Mark Holiday / Half Day" onClose={() => (savingHoliday ? null : setHolidayModalOpen(false))}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              For {formatDate(today)}. This stops Take Attendance from asking for a session that
              was never actually held.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setHolidayType("FULL_DAY")}
                disabled={!canFullDay}
                title={canFullDay ? undefined : "A session today has already been taken or cancelled"}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  holidayType === "FULL_DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Full-Day Holiday
              </button>
              <button
                type="button"
                onClick={() => setHolidayType("HALF_DAY")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  holidayType === "HALF_DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Half Day
              </button>
            </div>

            {holidayType === "HALF_DAY" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Which session is cancelled?</label>
                <select
                  value={cancelledSession}
                  onChange={(e) => setCancelledSession(e.target.value as AttendanceSession)}
                  className={inputClass}
                >
                  <option value="MORNING" disabled={morningResolved}>
                    Morning{morningResolved ? " (already resolved)" : ""}
                  </option>
                  <option value="AFTERNOON" disabled={afternoonResolved}>
                    Afternoon{afternoonResolved ? " (already resolved)" : ""}
                  </option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Heavy rain, school event"
                className={inputClass}
              />
            </div>

            {holidayError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{holidayError}</p>
            )}

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => setHolidayModalOpen(false)}
                disabled={savingHoliday}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareHoliday}
                disabled={savingHoliday}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {savingHoliday ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

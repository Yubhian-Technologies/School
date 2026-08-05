"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarOff, CheckCircle2, Pencil, Sun, Sunset, Users, XCircle } from "lucide-react";
import Modal from "@/components/Modal";
import StatCard from "@/components/StatCard";
import { ToastStack, useToastStack } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  getTodayDateString,
  submitSessionAttendance,
  subscribeToAttendanceRecordsForDate,
  subscribeToAttendanceSummary,
  type AttendanceEntryInput,
} from "@/lib/attendance";
import { isDefaultHoliday, isSessionCancelled, subscribeToHoliday } from "@/lib/holidays";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import { subscribeToStudentsForClass } from "@/lib/students";
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceSummary,
  ClassSection,
  Holiday,
  Student,
} from "@/lib/types";

interface RowState {
  present: boolean | null; // null = not marked yet
  remark: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const SESSION_LABEL: Record<AttendanceSession, string> = {
  MORNING: "Morning Attendance",
  AFTERNOON: "Afternoon Attendance",
};

function formatDateLong(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
  });
}

function SessionTab({
  session,
  active,
  submitted,
  cancelled,
  onClick,
}: {
  session: AttendanceSession;
  active: boolean;
  submitted: boolean;
  cancelled: boolean;
  onClick: () => void;
}) {
  const Icon = session === "MORNING" ? Sun : Sunset;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {SESSION_LABEL[session]}
      {cancelled ? (
        <CalendarOff className="h-4 w-4 text-amber-600" />
      ) : (
        submitted && <CheckCircle2 className="h-4 w-4 text-green-600" />
      )}
    </button>
  );
}

function StudentAvatar({ student }: { student: Student }) {
  if (student.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={student.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  const initials = student.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
      {initials}
    </div>
  );
}

export default function TakeAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const today = getTodayDateString();

  // Pre-selects a date passed in from the History list's "Edit" link
  // (?date=YYYY-MM-DD); future dates are never legitimate (attendance can't
  // be taken ahead of time) so any bogus/future value falls back to today —
  // defense in depth alongside the <input type="date" max={today}> below,
  // which only stops the picker UI itself, not a hand-edited URL.
  const [selectedDate, setSelectedDate] = useState(() => {
    const fromQuery = searchParams.get("date");
    return fromQuery && fromQuery <= today ? fromQuery : today;
  });

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [morningSummary, setMorningSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [afternoonSummary, setAfternoonSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [holiday, setHoliday] = useState<Holiday | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[] | null>(null);
  // Tagged with the date it was fetched for, so the pre-fill effect below
  // can tell "records for the date I just switched to haven't arrived yet"
  // apart from "records for the previous date, about to be replaced" —
  // otherwise a stale snapshot could briefly pre-fill the wrong date's data.
  const [recordsForDate, setRecordsForDate] = useState<{ date: string; records: AttendanceRecord[] } | null>(
    null
  );
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // null = no explicit tab click yet — the effective tab then follows a
  // sensible default (computed below), so it starts on whichever session
  // isn't cancelled.
  const [userSession, setUserSession] = useState<AttendanceSession | null>(null);

  const { toasts, show, dismiss } = useToastStack();

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, selectedDate, "MORNING", setMorningSummary);
  }, [mySection, selectedDate]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, selectedDate, "AFTERNOON", setAfternoonSummary);
  }, [mySection, selectedDate]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToHoliday(schoolId, selectedDate, setHoliday);
  }, [schoolId, selectedDate]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToStudentsForClass(schoolId, mySection.id, setStudents);
  }, [schoolId, mySection]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceRecordsForDate(mySection.schoolId, mySection.id, selectedDate, (records) =>
      setRecordsForDate({ date: selectedDate, records })
    );
  }, [mySection, selectedDate]);

  const holidayReason = holiday?.reason ?? (isDefaultHoliday(selectedDate) ? "Sunday" : undefined);
  const morningCancelled = isSessionCancelled(selectedDate, holiday, "MORNING");
  const afternoonCancelled = isSessionCancelled(selectedDate, holiday, "AFTERNOON");

  // Lands on whichever session isn't cancelled, unless the teacher
  // explicitly clicked a tab. Being already-submitted no longer skips a
  // session by default — it's editable, not locked, so landing there to
  // review/edit it is a perfectly normal default.
  const selectedSession: AttendanceSession = userSession ?? (morningCancelled ? "AFTERNOON" : "MORNING");

  function selectSession(session: AttendanceSession) {
    setUserSession(session);
  }

  function changeDate(date: string) {
    setSelectedDate(date);
    setUserSession(null);
  }

  // Pre-fills `rows` from the existing attendance records the moment a
  // (date, session) that hasn't been seeded yet has its records loaded —
  // keyed so it seeds exactly once per (date, session), not on every
  // subsequent snapshot update, which would otherwise clobber whatever the
  // teacher is actively typing. Adjusted during render (React's documented
  // pattern for "reset/derive state when a dependency changes") rather than
  // in a useEffect, which would call setState synchronously inside the
  // effect body.
  const [seededKey, setSeededKey] = useState<string | null>(null);
  const currentKey = `${selectedDate}_${selectedSession}`;
  if (seededKey !== currentKey && recordsForDate && recordsForDate.date === selectedDate) {
    setSeededKey(currentKey);
    const seeded: Record<string, RowState> = {};
    for (const r of recordsForDate.records) {
      if (r.session !== selectedSession) continue;
      seeded[r.studentId] = { present: r.present, remark: r.remark ?? "" };
    }
    setRows(seeded);
  }

  function setPresent(studentId: string, present: boolean) {
    setRows((r) => ({ ...r, [studentId]: { present, remark: r[studentId]?.remark ?? "" } }));
  }

  function setRemark(studentId: string, remark: string) {
    setRows((r) => ({ ...r, [studentId]: { present: r[studentId]?.present ?? null, remark } }));
  }

  const activeStudents = useMemo(
    () => (students ?? []).filter((s) => s.status === "active"),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return activeStudents;
    return activeStudents.filter(
      (s) => s.name.toLowerCase().includes(term) || s.rollNo.toLowerCase().includes(term)
    );
  }, [activeStudents, searchTerm]);

  const totals = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unset = 0;
    for (const s of activeStudents) {
      const mark = rows[s.id]?.present;
      if (mark === undefined || mark === null) unset++;
      else if (mark) present++;
      else absent++;
    }
    return { present, absent, unset };
  }, [activeStudents, rows]);

  const selectedSummary = selectedSession === "MORNING" ? morningSummary : afternoonSummary;
  const selectedCancelled = selectedSession === "MORNING" ? morningCancelled : afternoonCancelled;
  const isEditingSelected = Boolean(selectedSummary);
  const canSubmit = !selectedCancelled && activeStudents.length > 0 && totals.unset === 0;
  const bothCancelled = morningCancelled && afternoonCancelled;

  async function handleConfirmSubmit() {
    if (!schoolId || !mySection || !user) return;
    setSubmitting(true);
    try {
      const entries: AttendanceEntryInput[] = activeStudents.map((s) => ({
        studentId: s.id,
        present: rows[s.id]!.present as boolean,
        remark: rows[s.id]?.remark,
      }));
      await submitSessionAttendance({
        schoolId,
        classSectionId: mySection.id,
        date: selectedDate,
        session: selectedSession,
        teacherUid: user.uid,
        entries,
      });
      show(`${SESSION_LABEL[selectedSession]} ${isEditingSelected ? "updated" : "submitted"}.`);
      setConfirmOpen(false);
      // Auto-advance to Afternoon only for the common "taking today's
      // attendance fresh" flow, where Afternoon hasn't been touched at all
      // yet — an edit to an already-fully-recorded date just returns to the
      // dashboard instead of forcing a revisit of the other session.
      const afternoonUntouched = !afternoonSummary && !afternoonCancelled;
      if (selectedSession === "MORNING" && afternoonUntouched) {
        // Switching the tab changes currentKey, which the render-time
        // seeding check above picks up on its own — no afternoon records
        // exist yet, so it naturally seeds an empty rows for the new key.
        setUserSession("AFTERNOON");
      } else {
        router.replace(`/faculty/class/${DEMO_CLASS_ID}/attendance`);
      }
    } catch (err) {
      show(
        err instanceof Error
          ? err.message
          : "Could not save attendance. Please try again.",
        "error"
      );
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (mySection === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (mySection === null) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Morning &amp; Afternoon Attendance
        </h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            You haven&apos;t been assigned as a Class Teacher yet. Ask your Admin to assign you to a
            class &amp; section under Admin · Classes.
          </p>
        </div>
      </div>
    );
  }

  if (bothCancelled) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Morning &amp; Afternoon Attendance
        </h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            {formatDateLong(selectedDate)} is a holiday{holidayReason ? ` — ${holidayReason}` : ""} — no
            attendance is required.
          </p>
          <Link
            href={`/faculty/class/${DEMO_CLASS_ID}/attendance`}
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Attendance
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/faculty/class/${DEMO_CLASS_ID}/attendance`}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← Attendance
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            Morning &amp; Afternoon Attendance
          </h1>
          <p className="text-sm text-gray-500">Attendance · Morning &amp; Afternoon Attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && changeDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
            {mySection.className} - {mySection.sectionName}
          </div>
          {!selectedCancelled && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
            >
              {isEditingSelected ? "Update" : "Save"} {SESSION_LABEL[selectedSession]}
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-sm font-medium text-gray-600">{formatDateLong(selectedDate)}</p>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        <SessionTab
          session="MORNING"
          active={selectedSession === "MORNING"}
          submitted={Boolean(morningSummary)}
          cancelled={morningCancelled}
          onClick={() => selectSession("MORNING")}
        />
        <SessionTab
          session="AFTERNOON"
          active={selectedSession === "AFTERNOON"}
          submitted={Boolean(afternoonSummary)}
          cancelled={afternoonCancelled}
          onClick={() => selectSession("AFTERNOON")}
        />
      </div>

      {selectedCancelled ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CalendarOff className="mx-auto h-8 w-8 text-amber-600" />
          <p className="mt-2 text-sm text-gray-700">
            {SESSION_LABEL[selectedSession]} is cancelled on {formatDateLong(selectedDate)}
            {holidayReason ? ` — ${holidayReason}` : ""}. No attendance is required for this
            session. Declared by your school&apos;s Admin under Holidays.
          </p>
        </div>
      ) : (
        <>
          {isEditingSelected && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              <Pencil className="h-4 w-4 shrink-0" />
              Editing an already-submitted record{selectedSummary?.updatedAt ? " — previously edited before" : ""}. Saving will overwrite it.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Users} label="Total Students" value={activeStudents.length} color="indigo" />
            <StatCard icon={CheckCircle2} label="Present" value={totals.present} color="green" />
            <StatCard icon={XCircle} label="Absent" value={totals.absent} color="red" />
            <StatCard icon={Sun} label="Not Marked" value={totals.unset} color="amber" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or roll number"
              className={`${inputClass} max-w-sm`}
            />
            <p className="text-sm text-gray-500">
              {totals.unset > 0
                ? `${totals.unset} student${totals.unset === 1 ? "" : "s"} not marked yet.`
                : "All students marked."}
            </p>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            {students === null ? (
              <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
            ) : activeStudents.length === 0 ? (
              <p className="p-16 text-center text-sm text-gray-500">No active students in this class.</p>
            ) : filteredStudents.length === 0 ? (
              <p className="p-10 text-center text-sm text-gray-500">No students match your search.</p>
            ) : (
              <table className="w-full min-w-max text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3 text-center">Present</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((s) => {
                    const row = rows[s.id];
                    const unresolved = row?.present === undefined || row?.present === null;
                    return (
                      <tr key={s.id} className={unresolved ? "bg-amber-50/50" : undefined}>
                        <td className="px-4 py-3 text-gray-600">{s.rollNo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-medium text-gray-900">
                            <StudentAvatar student={s} />
                            {s.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row?.present === true}
                            onChange={() => setPresent(s.id, true)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row?.present === false}
                            onChange={() => setPresent(s.id, false)}
                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={row?.remark ?? ""}
                            onChange={(e) => setRemark(s.id, e.target.value)}
                            placeholder="Enter remarks"
                            className={inputClass}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Don&apos;t forget to click {isEditingSelected ? "Update" : "Save"} {SESSION_LABEL[selectedSession]}{" "}
            after marking. You can come back and edit this later from the History list.
          </p>
        </>
      )}

      {confirmOpen && (
        <Modal
          title={`${isEditingSelected ? "Update" : "Submit"} ${SESSION_LABEL[selectedSession]}?`}
          onClose={() => (submitting ? null : setConfirmOpen(false))}
          maxWidthClassName="max-w-md"
          maxHeightClassName="max-h-[90vh]"
          overlayPaddingClassName="px-4"
          dialogDecorationClassName="rounded-2xl border border-gray-200 shadow-lg"
          overlayPositionClassName="inset-0"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Present: <span className="font-semibold text-gray-900">{totals.present}</span> · Absent:{" "}
              <span className="font-semibold text-gray-900">{totals.absent}</span>
            </p>
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              {isEditingSelected
                ? `This will overwrite the existing ${SESSION_LABEL[selectedSession].toLowerCase()} record for ${formatDateLong(selectedDate)}.`
                : "You can come back and edit this later from the History list."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Confirm & Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

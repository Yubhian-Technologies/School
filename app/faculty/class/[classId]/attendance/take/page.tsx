"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { ToastStack, useToastStack } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  getTodayDateString,
  submitAttendance,
  subscribeToAttendanceSummary,
  type AttendanceEntryInput,
} from "@/lib/attendance";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import { subscribeToStudentsForClass } from "@/lib/students";
import type { AttendanceSession, AttendanceSummary, ClassSection, Student } from "@/lib/types";

type RowStatus = "PRESENT" | "ABSENT" | "HALF_DAY";

interface RowState {
  status: RowStatus | null;
  session?: AttendanceSession;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function StatusPill({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: "green" | "red" | "amber";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClasses = {
    green: "bg-green-600 text-white border-green-600",
    red: "bg-red-600 text-white border-red-600",
    amber: "bg-amber-500 text-white border-amber-500",
  }[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
        active ? activeClasses : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function TakeAttendancePage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const today = getTodayDateString();

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [todaySummary, setTodaySummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { toasts, show, dismiss } = useToastStack();

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, today, setTodaySummary);
  }, [mySection, today]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToStudentsForClass(schoolId, mySection.id, setStudents);
  }, [schoolId, mySection]);

  function setRowStatus(studentId: string, status: RowStatus) {
    setRows((r) => ({
      ...r,
      [studentId]: { status, session: status === "HALF_DAY" ? r[studentId]?.session : undefined },
    }));
  }

  function setRowSession(studentId: string, session: AttendanceSession) {
    setRows((r) => ({ ...r, [studentId]: { status: "HALF_DAY", session } }));
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
    let halfDay = 0;
    let unset = 0;
    let missingSession = 0;
    for (const s of activeStudents) {
      const row = rows[s.id];
      if (!row?.status) {
        unset++;
        continue;
      }
      if (row.status === "PRESENT") present++;
      else if (row.status === "ABSENT") absent++;
      else {
        halfDay++;
        if (!row.session) missingSession++;
      }
    }
    return { present, absent, halfDay, unset, missingSession };
  }, [activeStudents, rows]);

  const canSubmit =
    activeStudents.length > 0 && totals.unset === 0 && totals.missingSession === 0;

  async function handleConfirmSubmit() {
    if (!schoolId || !mySection || !user) return;
    setSubmitting(true);
    try {
      const entries: AttendanceEntryInput[] = activeStudents.map((s) => {
        const row = rows[s.id];
        return {
          studentId: s.id,
          status: row!.status as AttendanceEntryInput["status"],
          session: row!.session,
        };
      });
      await submitAttendance({
        schoolId,
        classSectionId: mySection.id,
        date: today,
        teacherUid: user.uid,
        entries,
      });
      show("Attendance submitted.");
      setConfirmOpen(false);
      router.replace(`/faculty/class/${DEMO_CLASS_ID}/attendance`);
    } catch (err) {
      show(
        err instanceof Error
          ? err.message
          : "Could not submit attendance — it may already have been taken today.",
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
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Take Attendance</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            You haven&apos;t been assigned as a Class Teacher yet. Ask your Admin to assign you to a
            class &amp; section under Admin · Classes.
          </p>
        </div>
      </div>
    );
  }

  if (todaySummary) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Take Attendance</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            Today&apos;s attendance has already been submitted and can&apos;t be changed.
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
    <div className="pb-24">
      <Link
        href={`/faculty/class/${DEMO_CLASS_ID}/attendance`}
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Attendance
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Take Attendance</h1>
          <p className="text-sm text-gray-500">
            {mySection.className} — Section {mySection.sectionName} ·{" "}
            {new Date(`${today}T00:00:00`).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name or roll number"
        className={`${inputClass} mt-4 max-w-sm`}
      />

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-md bg-green-50 px-2.5 py-1 text-green-700">
          Present: {totals.present}
        </span>
        <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700">
          Absent: {totals.absent}
        </span>
        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-700">
          Half Day: {totals.halfDay}
        </span>
        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-gray-600">
          Not marked: {totals.unset}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {students === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : activeStudents.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">No active students in this class.</p>
        ) : filteredStudents.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">No students match your search.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((s) => {
                const row = rows[s.id];
                const needsSession = row?.status === "HALF_DAY" && !row.session;
                return (
                  <tr key={s.id} className={needsSession ? "bg-amber-50/60" : undefined}>
                    <td className="px-4 py-3 text-gray-600">{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          active={row?.status === "PRESENT"}
                          color="green"
                          onClick={() => setRowStatus(s.id, "PRESENT")}
                        >
                          Present
                        </StatusPill>
                        <StatusPill
                          active={row?.status === "ABSENT"}
                          color="red"
                          onClick={() => setRowStatus(s.id, "ABSENT")}
                        >
                          Absent
                        </StatusPill>
                        <StatusPill
                          active={row?.status === "HALF_DAY"}
                          color="amber"
                          onClick={() => setRowStatus(s.id, "HALF_DAY")}
                        >
                          Half Day
                        </StatusPill>
                        {row?.status === "HALF_DAY" && (
                          <select
                            value={row.session ?? ""}
                            onChange={(e) => setRowSession(s.id, e.target.value as AttendanceSession)}
                            className={`rounded-md border px-2 py-1 text-xs ${
                              needsSession ? "border-amber-400" : "border-gray-300"
                            }`}
                          >
                            <option value="" disabled>
                              Choose AM/PM
                            </option>
                            <option value="MORNING">Present morning, absent afternoon</option>
                            <option value="AFTERNOON">Absent morning, present afternoon</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {totals.unset > 0
              ? `${totals.unset} student${totals.unset === 1 ? "" : "s"} not marked yet.`
              : totals.missingSession > 0
              ? "Choose a Morning/Afternoon option for every Half Day student."
              : "All students marked."}
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
          >
            Save Attendance
          </button>
        </div>
      </div>

      {confirmOpen && (
        <Modal title="Submit Attendance?" onClose={() => (submitting ? null : setConfirmOpen(false))}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Present: <span className="font-semibold text-gray-900">{totals.present}</span> · Absent:{" "}
              <span className="font-semibold text-gray-900">{totals.absent}</span> · Half Day:{" "}
              <span className="font-semibold text-gray-900">{totals.halfDay}</span>
            </p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This cannot be changed once submitted.
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
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

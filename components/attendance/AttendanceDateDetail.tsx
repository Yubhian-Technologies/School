"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  computeAttendancePercent,
  subscribeToAttendanceRecordsForDate,
  subscribeToAttendanceSummary,
} from "@/lib/attendance";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import { subscribeToStudentsForClass } from "@/lib/students";
import type { AttendanceRecord, AttendanceSummary, ClassSection, Student } from "@/lib/types";

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

function StatusBadge({ record }: { record: AttendanceRecord }) {
  if (record.status === "PRESENT") {
    return (
      <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        Present
      </span>
    );
  }
  if (record.status === "ABSENT") {
    return (
      <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Absent
      </span>
    );
  }
  if (record.status === "HALF_DAY") {
    return (
      <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Half Day —{" "}
        {record.session === "MORNING" ? "present morning" : "present afternoon"}
      </span>
    );
  }
  return (
    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
      {record.status}
    </span>
  );
}

export default function AttendanceDateDetail({ date }: { date: string }) {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [summary, setSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, date, setSummary);
  }, [mySection, date]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceRecordsForDate(mySection.id, date, setRecords);
  }, [mySection, date]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToStudentsForClass(schoolId, mySection.id, setStudents);
  }, [schoolId, mySection]);

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

  const studentById = new Map(students.map((s) => [s.id, s]));
  const sortedRecords = [...records].sort((a, b) => {
    const rollA = studentById.get(a.studentId)?.rollNo ?? "";
    const rollB = studentById.get(b.studentId)?.rollNo ?? "";
    return rollA.localeCompare(rollB);
  });

  return (
    <div>
      <Link
        href={`/faculty/class/${DEMO_CLASS_ID}/attendance`}
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Attendance
      </Link>
      <div className="mt-1">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Attendance — {formatDate(date)}
        </h1>
        <p className="text-sm text-gray-500">
          {mySection.className} — Section {mySection.sectionName} · Read-only
        </p>
      </div>

      {summary === undefined ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : summary === null ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No attendance was recorded for this date.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatBadge label="Present" value={summary.presentCount} />
            <StatBadge label="Absent" value={summary.absentCount} />
            <StatBadge label="Half Day" value={summary.halfDayCount} />
            <StatBadge label="Total" value={summary.totalStudents} />
            <StatBadge label="Attendance %" value={`${computeAttendancePercent(summary)}%`} />
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRecords.map((r) => {
                  const student = studentById.get(r.studentId);
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-gray-600">{student?.rollNo ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {student?.name ?? "(removed student)"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge record={r} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

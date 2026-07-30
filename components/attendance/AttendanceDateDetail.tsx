"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  computeDayAttendancePercent,
  computeSessionAttendancePercent,
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

function SessionBadge({ record }: { record: AttendanceRecord | undefined }) {
  if (!record) {
    return (
      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
        Not taken
      </span>
    );
  }
  return record.present ? (
    <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
      Present
    </span>
  ) : (
    <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Absent</span>
  );
}

export default function AttendanceDateDetail({ date }: { date: string }) {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [morningSummary, setMorningSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [afternoonSummary, setAfternoonSummary] = useState<AttendanceSummary | null | undefined>(undefined);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, date, "MORNING", setMorningSummary);
  }, [mySection, date]);

  useEffect(() => {
    if (!mySection) return;
    return subscribeToAttendanceSummary(mySection.id, date, "AFTERNOON", setAfternoonSummary);
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
  const recordsByStudent = new Map<string, { morning?: AttendanceRecord; afternoon?: AttendanceRecord }>();
  for (const r of records) {
    const entry = recordsByStudent.get(r.studentId) ?? {};
    if (r.session === "MORNING") entry.morning = r;
    else entry.afternoon = r;
    recordsByStudent.set(r.studentId, entry);
  }
  const sortedStudentIds = [...recordsByStudent.keys()].sort((a, b) => {
    const rollA = studentById.get(a)?.rollNo ?? "";
    const rollB = studentById.get(b)?.rollNo ?? "";
    return rollA.localeCompare(rollB);
  });

  const noneTaken = morningSummary === null && afternoonSummary === null;
  const loading = morningSummary === undefined || afternoonSummary === undefined;

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

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : noneTaken ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No attendance was recorded for this date.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBadge
              label="Morning Present"
              value={morningSummary ? morningSummary.presentCount : "—"}
            />
            <StatBadge
              label="Afternoon Present"
              value={afternoonSummary ? afternoonSummary.presentCount : "—"}
            />
            <StatBadge
              label="Morning %"
              value={morningSummary ? `${computeSessionAttendancePercent(morningSummary)}%` : "—"}
            />
            <StatBadge
              label="Day Attendance %"
              value={`${computeDayAttendancePercent(morningSummary, afternoonSummary)}%`}
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Morning</th>
                  <th className="px-4 py-3">Afternoon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedStudentIds.map((studentId) => {
                  const student = studentById.get(studentId);
                  const entry = recordsByStudent.get(studentId)!;
                  return (
                    <tr key={studentId}>
                      <td className="px-4 py-3 text-gray-600">{student?.rollNo ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {student?.name ?? "(removed student)"}
                      </td>
                      <td className="px-4 py-3">
                        <SessionBadge record={entry.morning} />
                      </td>
                      <td className="px-4 py-3">
                        <SessionBadge record={entry.afternoon} />
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

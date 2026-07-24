"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Clock, Percent } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { subscribeToChildAttendanceForRange, summarizeAttendanceRecords } from "@/lib/attendance";
import { subscribeToLinkedStudent } from "@/lib/students";
import type { AttendanceRecord, Student } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${pad(month + 1)}-01`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
  return { start, end, daysInMonth };
}

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function statusDotClass(record: AttendanceRecord | undefined) {
  if (!record) return "";
  if (record.status === "PRESENT") return "bg-green-500";
  if (record.status === "ABSENT") return "bg-red-500";
  if (record.status === "HALF_DAY") return "bg-amber-500";
  return "bg-gray-400";
}

function statusLabel(record: AttendanceRecord) {
  if (record.status === "PRESENT") return "Present";
  if (record.status === "ABSENT") return "Absent";
  if (record.status === "HALF_DAY") {
    return `Half Day — ${record.session === "MORNING" ? "present morning, absent afternoon" : "absent morning, present afternoon"}`;
  }
  return record.status;
}

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[] | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToLinkedStudent(user.uid, setStudent);
  }, [user]);

  const { start, end, daysInMonth } = monthBounds(viewDate.year, viewDate.month);

  useEffect(() => {
    if (!student) return;
    return subscribeToChildAttendanceForRange(student.id, start, end, setMonthRecords);
  }, [student, start, end]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of monthRecords ?? []) map.set(r.date, r);
    return map;
  }, [monthRecords]);

  const summary = useMemo(() => summarizeAttendanceRecords(monthRecords ?? []), [monthRecords]);

  if (student === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (student === null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Attendance" subtitle="Your child's attendance record" />
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No student is linked to this account yet.</p>
        </div>
      </div>
    );
  }

  const leadingBlanks = new Date(viewDate.year, viewDate.month, 1).getDay();
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function changeMonth(delta: number) {
    setViewDate((v) => {
      const next = new Date(v.year, v.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Attendance" subtitle={`${student.name}'s attendance record`} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Present Days" value={summary.present} color="green" />
        <StatCard icon={CalendarX} label="Absent Days" value={summary.absent} color="pink" />
        <StatCard icon={Clock} label="Half Days" value={summary.halfDay} color="amber" />
        <StatCard icon={Percent} label="Attendance %" value={`${summary.percent}%`} color="indigo" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-gray-900">
            {MONTH_LABEL.format(new Date(viewDate.year, viewDate.month, 1))}
          </p>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {monthRecords === null ? (
          <p className="mt-6 text-center text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-1 font-medium text-gray-400">
                {d}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {dayCells.map((day) => {
              const dateStr = `${viewDate.year}-${pad(viewDate.month + 1)}-${pad(day)}`;
              const record = recordsByDate.get(dateStr);
              return (
                <button
                  key={day}
                  disabled={!record}
                  onClick={() => record && setSelectedRecord(record)}
                  className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm ${
                    record
                      ? "cursor-pointer text-gray-900 hover:bg-gray-50"
                      : "cursor-default text-gray-400"
                  }`}
                >
                  <span>{day}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(record)}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedRecord && (
        <Modal title="Attendance Detail" onClose={() => setSelectedRecord(null)}>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-gray-900">
              {new Date(`${selectedRecord.date}T00:00:00`).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-gray-600">{statusLabel(selectedRecord)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

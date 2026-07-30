"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { groupRecordsByDate, subscribeToChildAttendanceForRange, type DayAttendance } from "@/lib/attendance";
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

function dayStatusDotClass(day: DayAttendance | undefined) {
  if (!day || (!day.morning && !day.afternoon)) return "";
  if (day.morning?.present && day.afternoon?.present) return "bg-green-500";
  if (day.morning && day.afternoon && !day.morning.present && !day.afternoon.present) return "bg-red-500";
  return "bg-amber-500";
}

function sessionLabel(record: AttendanceRecord | undefined) {
  if (!record) return "Not taken";
  return record.present ? "Present" : "Absent";
}

function sessionRatio(records: AttendanceRecord[]) {
  const present = records.filter((r) => r.present).length;
  const total = records.length;
  const percent = total === 0 ? 0 : (present / total) * 100;
  return { present, total, percent };
}

function AttendancePanel({
  label,
  present,
  total,
  percent,
  showRatio,
  bg,
  text,
}: {
  label: string;
  present: number;
  total: number;
  percent: number;
  showRatio: boolean;
  bg: string;
  text: string;
}) {
  return (
    <div className={`flex-1 px-4 py-4 text-center ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${text}`}>{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">
        {showRatio ? `${present} / ${total} (${percent.toFixed(2)}%)` : `${percent.toFixed(2)}%`}
      </p>
    </div>
  );
}

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayAttendance | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToLinkedStudent(user.uid, setStudent);
  }, [user]);

  const { start, end, daysInMonth } = monthBounds(viewDate.year, viewDate.month);

  useEffect(() => {
    if (!student) return;
    return subscribeToChildAttendanceForRange(student.id, start, end, setMonthRecords);
  }, [student, start, end]);

  const dayRowsByDate = useMemo(() => groupRecordsByDate(monthRecords ?? []), [monthRecords]);

  const morningStats = useMemo(
    () => sessionRatio((monthRecords ?? []).filter((r) => r.session === "MORNING")),
    [monthRecords]
  );
  const afternoonStats = useMemo(
    () => sessionRatio((monthRecords ?? []).filter((r) => r.session === "AFTERNOON")),
    [monthRecords]
  );
  const overallStats = useMemo(() => sessionRatio(monthRecords ?? []), [monthRecords]);

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

      <div className="flex divide-x divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <AttendancePanel
          label="Morning Attendance"
          present={morningStats.present}
          total={morningStats.total}
          percent={morningStats.percent}
          showRatio
          bg="bg-green-50"
          text="text-green-700"
        />
        <AttendancePanel
          label="Afternoon Attendance"
          present={afternoonStats.present}
          total={afternoonStats.total}
          percent={afternoonStats.percent}
          showRatio
          bg="bg-orange-50"
          text="text-orange-600"
        />
        <AttendancePanel
          label="Overall Attendance"
          present={overallStats.present}
          total={overallStats.total}
          percent={overallStats.percent}
          showRatio={false}
          bg="bg-indigo-50"
          text="text-indigo-600"
        />
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
              const dayRow = dayRowsByDate.get(dateStr);
              const hasData = Boolean(dayRow?.morning || dayRow?.afternoon);
              return (
                <button
                  key={day}
                  disabled={!hasData}
                  onClick={() => dayRow && setSelectedDay(dayRow)}
                  className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm ${
                    hasData ? "cursor-pointer text-gray-900 hover:bg-gray-50" : "cursor-default text-gray-400"
                  }`}
                >
                  <span>{day}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${dayStatusDotClass(dayRow)}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <Modal title="Attendance Detail" onClose={() => setSelectedDay(null)}>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-gray-900">
              {new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-gray-600">Morning: {sessionLabel(selectedDay.morning)}</p>
            <p className="text-gray-600">Afternoon: {sessionLabel(selectedDay.afternoon)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

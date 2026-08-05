"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Info, RotateCw } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { groupRecordsByDate, subscribeToChildAttendanceForRange, type DayAttendance } from "@/lib/attendance";
import { isDefaultHoliday, subscribeToHolidaysForRange } from "@/lib/holidays";
import { subscribeToLinkedStudent } from "@/lib/students";
import type { AttendanceRecord, Holiday, Student } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${pad(month + 1)}-01`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
  return { start, end, daysInMonth };
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2000, i, 1))
);

function dayStatusDotClass(day: DayAttendance | undefined, isHoliday: boolean) {
  if (isHoliday) return "bg-gray-400";
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

interface SelectedDayInfo extends DayAttendance {
  isHoliday: boolean;
  holidayReason?: string;
}

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[] | null>(null);
  const [monthHolidays, setMonthHolidays] = useState<Holiday[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDayInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    return subscribeToLinkedStudent(user.uid, setStudent);
  }, [user]);

  const { start, end, daysInMonth } = monthBounds(viewDate.year, viewDate.month);

  useEffect(() => {
    if (!student) return;
    return subscribeToChildAttendanceForRange(student.id, start, end, setMonthRecords);
  }, [student, start, end, refreshKey]);

  useEffect(() => {
    if (!student) return;
    return subscribeToHolidaysForRange(student.schoolId, start, end, setMonthHolidays);
  }, [student, start, end]);

  const dayRowsByDate = useMemo(() => groupRecordsByDate(monthRecords ?? []), [monthRecords]);

  const monthHolidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of monthHolidays ?? []) map.set(h.date, h);
    return map;
  }, [monthHolidays]);

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
        <PageHeader title="My Attendance" subtitle="Monthly attendance records" />
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No student is linked to this account yet.</p>
        </div>
      </div>
    );
  }

  const leadingBlanks = new Date(viewDate.year, viewDate.month, 1).getDay();
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);
  const hasNoRecordsThisMonth = monthRecords !== null && monthRecords.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader title="My Attendance" subtitle="Monthly attendance records" />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={viewDate.month}
          onChange={(e) => setViewDate((v) => ({ ...v, month: Number(e.target.value) }))}
          className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={viewDate.year}
          onChange={(e) => setViewDate((v) => ({ ...v, year: Number(e.target.value) }))}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {hasNoRecordsThisMonth && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <Info className="h-4 w-4 shrink-0" />
          Attendance for this month has not been recorded yet.
        </div>
      )}

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
        <p className="text-sm font-semibold text-gray-900">
          {MONTH_NAMES[viewDate.month]} {viewDate.year}
        </p>

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
              const declaredHoliday = monthHolidaysByDate.get(dateStr);
              const isHoliday = Boolean(declaredHoliday) || isDefaultHoliday(dateStr);
              const clickable = hasData || isHoliday;
              return (
                <button
                  key={day}
                  disabled={!clickable}
                  onClick={() =>
                    clickable &&
                    setSelectedDay({
                      date: dateStr,
                      morning: dayRow?.morning,
                      afternoon: dayRow?.afternoon,
                      isHoliday,
                      holidayReason: declaredHoliday?.reason ?? (isDefaultHoliday(dateStr) ? "Sunday" : undefined),
                    })
                  }
                  className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm ${
                    clickable ? "cursor-pointer text-gray-900 hover:bg-gray-50" : "cursor-default text-gray-400"
                  }`}
                >
                  <span>{day}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${dayStatusDotClass(dayRow, isHoliday)}`} />
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
            {selectedDay.isHoliday ? (
              <p className="flex items-center gap-1.5 text-gray-600">
                <CalendarOff className="h-4 w-4 text-gray-400" />
                Holiday{selectedDay.holidayReason ? ` — ${selectedDay.holidayReason}` : ""}
              </p>
            ) : (
              <>
                <p className="text-gray-600">Morning: {sessionLabel(selectedDay.morning)}</p>
                <p className="text-gray-600">Afternoon: {sessionLabel(selectedDay.afternoon)}</p>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

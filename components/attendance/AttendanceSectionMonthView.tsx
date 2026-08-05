"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel } from "@/lib/classes";
import { getClassSection } from "@/lib/classSections";
import { getTodayDateString, subscribeToAttendanceHistory } from "@/lib/attendance";
import { subscribeToHolidaysForRange } from "@/lib/holidays";
import type { AttendanceSummary, ClassSection, Holiday } from "@/lib/types";
import AttendanceMonthTable, {
  buildMonthHistoryRows,
  monthBounds,
  MonthYearPicker,
  ymd,
} from "@/components/attendance/AttendanceMonthTable";
import AttendanceDateDetail from "@/components/attendance/AttendanceDateDetail";

/** buildMonthHistoryRows excludes any date >= excludeFrom — this read-only
 * view has no separate "today" card of its own (unlike the Faculty
 * Dashboard, which passes `today` to exclude it), so today should still
 * appear in the table like any other day. Passing tomorrow's date includes
 * today while still never showing genuinely future days. */
function tomorrow(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function AttendanceSectionMonthView({
  classId,
  sectionId,
}: {
  classId: string;
  sectionId: string;
}) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);
  const today = getTodayDateString();

  const [section, setSection] = useState<ClassSection | null | undefined>(undefined);
  const [history, setHistory] = useState<AttendanceSummary[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [monthHolidays, setMonthHolidays] = useState<Holiday[] | null>(null);
  const { start, end } = monthBounds(month.year, month.month);

  useEffect(() => {
    getClassSection(sectionId).then(setSection);
  }, [sectionId]);

  useEffect(() => {
    if (!section) return;
    return subscribeToAttendanceHistory(section.schoolId, sectionId, setHistory);
  }, [section, sectionId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToHolidaysForRange(schoolId, start, end, setMonthHolidays);
  }, [schoolId, start, end]);

  const rows = useMemo(
    () =>
      buildMonthHistoryRows({
        year: month.year,
        month: month.month,
        excludeFrom: tomorrow(today),
        history: history ?? [],
        monthHolidays: monthHolidays ?? [],
      }),
    [month, today, history, monthHolidays]
  );

  const loading = section === undefined || history === null || monthHolidays === null;

  if (selectedDate && section) {
    return (
      <div>
        <button
          onClick={() => setSelectedDate(null)}
          className="mb-1 text-sm text-indigo-600 hover:text-indigo-500"
        >
          ← Back to month view
        </button>
        <AttendanceDateDetail
          date={selectedDate}
          section={section}
          backHref={`/admin/attendance/${classId}/${sectionId}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/attendance/${classId}`} className="text-sm text-indigo-600 hover:text-indigo-500">
          ← {classLabel} Sections
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
          {classLabel} — Section {section?.sectionName ?? "…"}
        </h1>
        <p className="text-sm text-gray-500">Read-only</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Attendance by day</p>
        <MonthYearPicker month={month.month} year={month.year} onChange={setMonth} />
      </div>

      <AttendanceMonthTable
        rows={rows}
        loading={loading}
        renderActions={(d) =>
          d.morning || d.afternoon ? (
            <button
              onClick={() => setSelectedDate(d.date)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View
            </button>
          ) : null
        }
      />
    </div>
  );
}

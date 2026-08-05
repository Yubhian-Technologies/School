"use client";

import type { ReactNode } from "react";
import { CalendarOff } from "lucide-react";
import { computeDayAttendancePercent } from "@/lib/attendance";
import { isDefaultHoliday } from "@/lib/holidays";
import type { AttendanceSummary, Holiday } from "@/lib/types";

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ymd(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function monthBounds(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { start: ymd(year, month, 1), end: ymd(year, month, daysInMonth), daysInMonth };
}

export const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2000, i, 1))
);

export function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface DayRow {
  date: string;
  morning?: AttendanceSummary;
  afternoon?: AttendanceSummary;
}

/** One calendar day's row — real DayRow (has at least one submitted
 * session), a holiday, or a gap day that was skipped entirely (no summary,
 * not a holiday) — all shown, instead of skipped days silently not
 * appearing in the list at all. */
export interface AttendanceHistoryRow {
  date: string;
  morning?: AttendanceSummary;
  afternoon?: AttendanceSummary;
  isHoliday: boolean;
  holidayReason?: string;
}

/** Builds every day of `year`/`month` up to (not including) `excludeFrom` —
 * pass today's date string to stop before today (e.g. the Faculty Dashboard,
 * which shows today separately in its own card above), or a date one day
 * after today to include today too (Admin's read-only view, which has no
 * separate "today" card). Cross-references already-fetched summaries
 * (`history`) and holidays (`monthHolidays`) client-side — no extra
 * Firestore reads per day. */
export function buildMonthHistoryRows({
  year,
  month,
  excludeFrom,
  history,
  monthHolidays,
}: {
  year: number;
  month: number;
  excludeFrom: string;
  history: AttendanceSummary[];
  monthHolidays: Holiday[];
}): AttendanceHistoryRow[] {
  const dayRowsByDate = new Map<string, DayRow>();
  for (const s of history) {
    const row = dayRowsByDate.get(s.date) ?? { date: s.date };
    if (s.session === "MORNING") row.morning = s;
    else row.afternoon = s;
    dayRowsByDate.set(s.date, row);
  }

  const holidaysByDate = new Map<string, Holiday>();
  for (const h of monthHolidays) holidaysByDate.set(h.date, h);

  const { daysInMonth } = monthBounds(year, month);
  const rows: AttendanceHistoryRow[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = ymd(year, month, day);
    if (date >= excludeFrom) continue;
    const existing = dayRowsByDate.get(date);
    const declaredHoliday = holidaysByDate.get(date);
    const isHoliday = Boolean(declaredHoliday) || isDefaultHoliday(date);
    rows.push({
      date,
      morning: existing?.morning,
      afternoon: existing?.afternoon,
      isHoliday,
      holidayReason: declaredHoliday?.reason ?? (isDefaultHoliday(date) ? "Sunday" : undefined),
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function MonthYearPicker({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (next: { month: number; year: number }) => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={month}
        onChange={(e) => onChange({ month: Number(e.target.value), year })}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange({ month, year: Number(e.target.value) })}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AttendanceMonthTable({
  rows,
  loading,
  renderActions,
}: {
  rows: AttendanceHistoryRow[];
  loading: boolean;
  /** Returns the action links for one day's row — omit or return null for a
   * row with nothing actionable (e.g. Admin's read-only view on a day with
   * no data yet, since Admin can't take attendance). */
  renderActions?: (row: AttendanceHistoryRow) => ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {loading ? (
        <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-16 text-center text-sm text-gray-500">No days to show for this month yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Morning</th>
              <th className="px-4 py-3">Afternoon</th>
              <th className="px-4 py-3">Attendance %</th>
              {renderActions && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((d) => (
              <tr key={d.date} className={d.isHoliday ? "bg-gray-50/60" : undefined}>
                <td className="px-4 py-3 font-medium text-gray-900">{formatDate(d.date)}</td>
                {d.isHoliday ? (
                  <td colSpan={2} className="px-4 py-3 text-amber-700">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarOff className="h-3.5 w-3.5" />
                      Holiday{d.holidayReason ? ` — ${d.holidayReason}` : ""}
                    </span>
                  </td>
                ) : (
                  <>
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
                  </>
                )}
                <td className="px-4 py-3 text-gray-600">
                  {d.isHoliday ? "—" : `${computeDayAttendancePercent(d.morning, d.afternoon)}%`}
                </td>
                {renderActions && (
                  <td className="px-4 py-3">{!d.isHoliday && renderActions(d)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

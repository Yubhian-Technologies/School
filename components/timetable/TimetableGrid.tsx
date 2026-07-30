"use client";

import { Fragment } from "react";
import type {
  TimetableBreakDef,
  TimetableCellData,
  TimetableDayDef,
  TimetablePeriodDef,
} from "@/lib/types";

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

function BreakBanner({ brk, columns }: { brk: TimetableBreakDef; columns: number }) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="border border-gray-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700"
      >
        🍴 {brk.label || "Break"} · {brk.durationMinutes} min
      </td>
    </tr>
  );
}

interface MergeInfo {
  rowSpan: number;
  skip: boolean;
}

// Consecutive periods in the same day column that share the same subject
// (e.g. a "double period") are rendered as a single spanning cell instead of
// repeating the same subject twice — purely a display merge, the underlying
// per-period cell data is untouched. Never merges across a break: the break
// banner is a full-width row in between, so a spanning cell there would
// visually collide with it.
function buildMergeMap(
  days: TimetableDayDef[],
  periods: TimetablePeriodDef[],
  cells: Record<string, TimetableCellData>,
  breaksAfterPeriod: (periodId: string) => TimetableBreakDef[]
): Record<string, MergeInfo[]> {
  const map: Record<string, MergeInfo[]> = {};
  for (const day of days) {
    const info: MergeInfo[] = periods.map(() => ({ rowSpan: 1, skip: false }));
    let i = 0;
    while (i < periods.length) {
      const subject = cells[`${day.id}_${periods[i].id}`]?.subject;
      if (!subject) {
        i++;
        continue;
      }
      let j = i;
      while (
        j + 1 < periods.length &&
        breaksAfterPeriod(periods[j].id).length === 0 &&
        cells[`${day.id}_${periods[j + 1].id}`]?.subject === subject
      ) {
        j++;
      }
      info[i] = { rowSpan: j - i + 1, skip: false };
      for (let k = i + 1; k <= j; k++) info[k] = { rowSpan: 1, skip: true };
      i = j + 1;
    }
    map[day.id] = info;
  }
  return map;
}

export default function TimetableGrid({
  days,
  periods,
  breaks,
  cells,
  onCellClick,
  readOnly = false,
  highlightFacultyId = null,
}: {
  days: TimetableDayDef[];
  periods: TimetablePeriodDef[];
  breaks: TimetableBreakDef[];
  cells: Record<string, TimetableCellData>;
  onCellClick?: (dayId: string, periodId: string) => void;
  /** Disables cell click/hover affordances — for Faculty/Parent read-only views. */
  readOnly?: boolean;
  /** Highlights any cell assigned to this faculty uid — for the Faculty timetable view. */
  highlightFacultyId?: string | null;
}) {
  const sortedDays = [...days].sort((a, b) => a.order - b.order);
  const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);
  const columns = sortedDays.length + 1;

  const breaksBeforeStart = breaks.filter((b) => b.afterPeriodId === null);
  const breaksAfterPeriod = (periodId: string) => breaks.filter((b) => b.afterPeriodId === periodId);

  const mergeMap = buildMergeMap(sortedDays, sortedPeriods, cells, breaksAfterPeriod);

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
              Period
            </th>
            {sortedDays.map((day) => (
              <th
                key={day.id}
                className="sticky top-0 z-10 min-w-32 border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {breaksBeforeStart.map((brk) => (
            <BreakBanner key={brk.id} brk={brk} columns={columns} />
          ))}
          {sortedPeriods.map((period, periodIdx) => (
            <Fragment key={period.id}>
              <tr>
                <td className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800">
                  {period.label}
                  {period.startTime && period.endTime && (
                    <div className="text-[11px] font-normal text-gray-500">
                      {formatTime(period.startTime)} – {formatTime(period.endTime)}
                    </div>
                  )}
                </td>
                {sortedDays.map((day) => {
                  const merge = mergeMap[day.id][periodIdx];
                  if (merge.skip) return null;

                  const cell = cells[`${day.id}_${period.id}`];
                  const hasContent = Boolean(cell?.subject || cell?.facultyName || cell?.room);
                  const isHighlighted =
                    highlightFacultyId !== null && cell?.facultyId === highlightFacultyId;

                  return (
                    <td
                      key={day.id}
                      rowSpan={merge.rowSpan}
                      onClick={readOnly ? undefined : () => onCellClick?.(day.id, period.id)}
                      className={`min-h-16 border border-gray-200 p-1.5 text-center align-middle transition-colors ${
                        readOnly ? "" : "cursor-pointer hover:bg-indigo-50/40"
                      } ${isHighlighted ? "bg-indigo-50" : ""}`}
                    >
                      {hasContent ? (
                        <div>
                          {cell.subject && (
                            <p className="text-sm font-semibold text-gray-900">{cell.subject}</p>
                          )}
                          {cell.facultyName && (
                            <p className="text-xs text-gray-600">{cell.facultyName}</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-300">{readOnly ? "—" : "+ Add Subject"}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {breaksAfterPeriod(period.id).map((brk) => (
                <BreakBanner key={brk.id} brk={brk} columns={columns} />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

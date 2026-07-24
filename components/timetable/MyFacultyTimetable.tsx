"use client";

import { useEffect, useMemo, useState } from "react";
import { getClassLabel } from "@/lib/classes";
import { subscribeToAllClassSections } from "@/lib/classSections";
import { subscribeToPublishedTimetablesForSchool } from "@/lib/timetableGrid";
import type { ClassSection, SectionTimetable } from "@/lib/types";
import TimetableSkeleton from "./TimetableSkeleton";

const WEEKDAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DEFAULT_DAY_COLUMNS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

interface PersonalSlot {
  dayLabel: string;
  startTime: string | null;
  endTime: string | null;
  periodLabel: string;
  periodOrder: number;
  classLabel: string;
  sectionName: string;
  subject: string;
  room: string;
}

interface PeriodRow {
  periodLabel: string;
  startTime: string | null;
  endTime: string | null;
  sortKey: number;
}

export default function MyFacultyTimetable({
  schoolId,
  facultyUid,
}: {
  schoolId: string;
  facultyUid: string;
}) {
  const [timetables, setTimetables] = useState<SectionTimetable[] | undefined>(undefined);
  const [sections, setSections] = useState<ClassSection[] | undefined>(undefined);

  useEffect(() => {
    return subscribeToPublishedTimetablesForSchool(schoolId, setTimetables);
  }, [schoolId]);

  useEffect(() => {
    return subscribeToAllClassSections(schoolId, setSections);
  }, [schoolId]);

  const grid = useMemo(() => {
    if (!timetables || !sections) return null;

    const sectionsById = new Map(sections.map((s) => [s.id, s]));
    const slots: PersonalSlot[] = [];

    for (const timetable of timetables) {
      const section = sectionsById.get(timetable.sectionId);
      const daysById = new Map(timetable.days.map((d) => [d.id, d]));
      const periodsById = new Map(timetable.periods.map((p) => [p.id, p]));

      for (const [key, cell] of Object.entries(timetable.cells)) {
        if (cell.facultyId !== facultyUid) continue;
        const [dayId, periodId] = key.split("_");
        const day = daysById.get(dayId);
        const period = periodsById.get(periodId);
        if (!day || !period) continue;

        slots.push({
          dayLabel: day.label,
          startTime: period.startTime ?? null,
          endTime: period.endTime ?? null,
          periodLabel: period.label,
          periodOrder: period.order,
          classLabel: getClassLabel(timetable.classId),
          sectionName: section?.sectionName ?? "",
          subject: cell.subject,
          room: cell.room,
        });
      }
    }

    // Rows: every distinct period label this faculty is assigned to at least
    // once, anywhere — sorted by start time where known, else by the period's
    // own order (each class section defines its periods independently, so
    // "order" is only a same-class-section-consistent fallback).
    const rowsByLabel = new Map<string, PeriodRow>();
    for (const slot of slots) {
      const existing = rowsByLabel.get(slot.periodLabel);
      const timeKey = slot.startTime
        ? Number(slot.startTime.replace(":", ""))
        : slot.periodOrder + 10000; // untimed periods sort after timed ones
      if (!existing || timeKey < existing.sortKey) {
        rowsByLabel.set(slot.periodLabel, {
          periodLabel: slot.periodLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
          sortKey: timeKey,
        });
      }
    }
    const rows = [...rowsByLabel.values()].sort((a, b) => a.sortKey - b.sortKey);

    // Columns: the standard Mon–Sat week, plus any differently-named day this
    // faculty actually has a period on (a section using custom day labels).
    const extraDays = [...new Set(slots.map((s) => s.dayLabel))]
      .filter((label) => !DEFAULT_DAY_COLUMNS.some((d) => d.toLowerCase() === label.trim().toLowerCase()))
      .sort((a, b) => {
        const aIndex = WEEKDAY_ORDER.indexOf(a.trim().toLowerCase());
        const bIndex = WEEKDAY_ORDER.indexOf(b.trim().toLowerCase());
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
    const columns = [...DEFAULT_DAY_COLUMNS, ...extraDays];

    // Cell lookup, keyed by "periodLabel||dayLabel" (case/whitespace-loose on
    // the day side since it's admin-typed free text).
    const cellMap = new Map<string, PersonalSlot>();
    for (const slot of slots) {
      const key = `${slot.periodLabel}||${slot.dayLabel.trim().toLowerCase()}`;
      if (!cellMap.has(key)) cellMap.set(key, slot);
    }

    return { rows, columns, cellMap, hasAnySlot: slots.length > 0 };
  }, [timetables, sections, facultyUid]);

  if (grid === null) {
    return <TimetableSkeleton />;
  }

  if (!grid.hasAnySlot) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-gray-500">
          You aren&apos;t assigned to any published timetable periods yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
              Period
            </th>
            {grid.columns.map((dayLabel) => (
              <th
                key={dayLabel}
                className="sticky top-0 z-10 min-w-36 border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700"
              >
                {dayLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.periodLabel}>
              <td className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800">
                {row.periodLabel}
                {row.startTime && row.endTime && (
                  <div className="text-[11px] font-normal text-gray-500">
                    {formatTime(row.startTime)} – {formatTime(row.endTime)}
                  </div>
                )}
              </td>
              {grid.columns.map((dayLabel) => {
                const slot = grid.cellMap.get(`${row.periodLabel}||${dayLabel.trim().toLowerCase()}`);
                return (
                  <td key={dayLabel} className="min-h-16 border border-gray-200 p-1.5 align-top">
                    {slot ? (
                      <div className="space-y-0.5 rounded-lg border-l-4 border-indigo-300 bg-indigo-50/60 px-2 py-1.5 shadow-sm">
                        <p className="text-sm font-semibold text-gray-900">
                          {slot.classLabel}
                          {slot.sectionName ? ` - ${slot.sectionName}` : ""}
                        </p>
                        {slot.subject && <p className="text-xs text-gray-600">{slot.subject}</p>}
                        {slot.room && <p className="text-[11px] text-gray-400">{slot.room}</p>}
                      </div>
                    ) : (
                      <div className="flex min-h-12 items-center justify-center text-xs text-gray-300">
                        —
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

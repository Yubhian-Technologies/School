"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel } from "@/lib/classes";
import { subscribeToPeriods } from "@/lib/timetableConfig";
import { getSection } from "@/lib/timetableSections";
import { DAYS, emptyCells, saveGrid, subscribeToGrid } from "@/lib/timetableGrid";
import type { DayOfWeek, GridRow, PeriodColumn, TimetableSection } from "@/lib/types";

interface Selection {
  day: DayOfWeek;
  periodIds: string[];
}

export default function TimetableGridEditor({
  classId,
  sectionId,
}: {
  classId: string;
  sectionId: string;
}) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [section, setSection] = useState<TimetableSection | null>(null);
  const [periods, setPeriods] = useState<PeriodColumn[] | null>(null);
  const [cells, setCells] = useState<Record<DayOfWeek, GridRow> | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mergeText, setMergeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const firstGridLoadRef = useRef(false);
  const awaitingSaveEchoRef = useRef(false);

  useEffect(() => {
    getSection(sectionId).then(setSection);
  }, [sectionId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToPeriods(schoolId, (config) => setPeriods(config?.periods ?? []));
  }, [schoolId]);

  useEffect(() => {
    firstGridLoadRef.current = false;
    return subscribeToGrid(sectionId, (grid) => {
      const incoming = grid?.cells ?? emptyCells();
      if (!firstGridLoadRef.current) {
        firstGridLoadRef.current = true;
        setCells(incoming);
        return;
      }
      if (awaitingSaveEchoRef.current) {
        awaitingSaveEchoRef.current = false;
        setCells(incoming);
      }
    });
  }, [sectionId]);

  const periodColumnIds = useMemo(
    () => (periods ?? []).filter((p) => p.type === "period").map((p) => p.id),
    [periods]
  );

  function updateCellText(day: DayOfWeek, periodId: string, text: string) {
    setSaved(false);
    setCells((prev) => {
      if (!prev) return prev;
      const row = { ...prev[day] };
      row[periodId] = { text, span: row[periodId]?.span ?? 1 };
      return { ...prev, [day]: row };
    });
  }

  function toggleSelect(day: DayOfWeek, periodId: string) {
    setSelection((sel) => {
      if (!sel || sel.day !== day) {
        return { day, periodIds: [periodId] };
      }
      if (sel.periodIds.includes(periodId)) {
        const remaining = sel.periodIds.filter((id) => id !== periodId);
        return remaining.length === 0 ? null : { day, periodIds: remaining };
      }
      const candidate = [...sel.periodIds, periodId];
      const indices = candidate
        .map((id) => periodColumnIds.indexOf(id))
        .sort((a, b) => a - b);
      const isContiguous = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
      return isContiguous ? { day, periodIds: candidate } : { day, periodIds: [periodId] };
    });
    setMergeText("");
  }

  function handleMerge() {
    if (!selection || selection.periodIds.length < 2 || !cells) return;
    const orderedIds = periodColumnIds.filter((id) => selection.periodIds.includes(id));
    const leftmost = orderedIds[0];

    setSaved(false);
    setCells((prev) => {
      if (!prev) return prev;
      const row = { ...prev[selection.day] };
      orderedIds.forEach((id) => delete row[id]);
      row[leftmost] = { text: mergeText, span: orderedIds.length };
      return { ...prev, [selection.day]: row };
    });
    setSelection(null);
    setMergeText("");
  }

  function handleUnmerge() {
    if (!selection || selection.periodIds.length !== 1 || !cells) return;
    const periodId = selection.periodIds[0];

    setSaved(false);
    setCells((prev) => {
      if (!prev) return prev;
      const row = { ...prev[selection.day] };
      delete row[periodId];
      return { ...prev, [selection.day]: row };
    });
    setSelection(null);
  }

  async function handleSave() {
    if (!cells || !schoolId) return;
    setError(null);
    setSaving(true);
    awaitingSaveEchoRef.current = true;
    try {
      await saveGrid({ schoolId, classId, sectionId, cells });
      setSaved(true);
    } catch {
      awaitingSaveEchoRef.current = false;
      setError("Could not save the timetable. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCell =
    selection && selection.periodIds.length === 1 && cells
      ? cells[selection.day][selection.periodIds[0]]
      : undefined;
  const showMergeToolbar = selection && selection.periodIds.length >= 2;
  const showUnmergeToolbar = selection && selection.periodIds.length === 1 && (selectedCell?.span ?? 1) > 1;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/admin/timetable/${classId}`}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← {classLabel} sections
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            {classLabel} · Section {section?.name ?? "…"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/timetable?managePeriods=1"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Edit shared period schedule →
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !cells}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {saved && !error && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved ✓</p>
      )}

      {(showMergeToolbar || showUnmergeToolbar) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          {showMergeToolbar && (
            <>
              <span className="text-sm text-indigo-700">
                Merge {selection?.periodIds.length} periods:
              </span>
              <input
                value={mergeText}
                onChange={(e) => setMergeText(e.target.value)}
                placeholder="e.g. CN LAB"
                className="rounded-md border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleMerge}
                className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Merge
              </button>
            </>
          )}
          {showUnmergeToolbar && (
            <>
              <span className="text-sm text-indigo-700">Merged cell selected</span>
              <button
                onClick={handleUnmerge}
                className="rounded-md bg-white px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-300 hover:bg-indigo-100"
              >
                Unmerge
              </button>
            </>
          )}
          <button
            onClick={() => setSelection(null)}
            className="ml-auto text-sm text-indigo-500 hover:text-indigo-700"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {periods === null || cells === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : periods.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No period schedule set up yet.{" "}
            <Link href="/admin/timetable?managePeriods=1" className="text-indigo-600 hover:text-indigo-500">
              Set it up first →
            </Link>
          </p>
        ) : (
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Day
                </th>
                {periods.map((period) => (
                  <th
                    key={period.id}
                    className={`border border-gray-200 px-3 py-2 text-xs font-medium ${
                      period.type === "break"
                        ? "bg-gray-100 text-gray-400"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    <div>{period.label}</div>
                    <div className="font-normal normal-case text-[11px] text-gray-400">
                      {period.startTime}–{period.endTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                let skip = 0;
                return (
                  <tr key={day}>
                    <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                      {day}
                    </td>
                    {periods.map((period) => {
                      if (period.type === "break") {
                        skip = 0;
                        return (
                          <td
                            key={period.id}
                            className="border border-gray-200 bg-gray-100 px-2 py-2 text-center text-xs text-gray-400"
                          >
                            {period.label}
                          </td>
                        );
                      }

                      if (skip > 0) {
                        skip -= 1;
                        return null;
                      }

                      const cell = cells[day][period.id];
                      const span = cell?.span ?? 1;
                      if (span > 1) skip = span - 1;
                      const isSelected =
                        selection?.day === day && selection.periodIds.includes(period.id);

                      return (
                        <td
                          key={period.id}
                          colSpan={span}
                          className={`border border-gray-200 px-2 py-1.5 align-top ${
                            isSelected ? "bg-indigo-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(day, period.id)}
                              className="mt-1 h-3.5 w-3.5 shrink-0"
                              aria-label={`Select ${day} ${period.label}`}
                            />
                            <input
                              type="text"
                              value={cell?.text ?? ""}
                              onChange={(e) => updateCellText(day, period.id, e.target.value)}
                              className="w-full min-w-[4rem] rounded border-0 bg-transparent px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

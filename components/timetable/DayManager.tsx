"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { TimetableDayDef } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function validateDays(days: TimetableDayDef[]): string | null {
  if (days.length === 0) return "Add at least one working day.";
  if (days.some((d) => !d.label.trim())) return "Every day needs a label.";
  const seen = new Set<string>();
  for (const day of days) {
    const key = day.label.trim().toLowerCase();
    if (seen.has(key)) return `Duplicate day name: "${day.label.trim()}".`;
    seen.add(key);
  }
  return null;
}

function newDay(order: number): TimetableDayDef {
  return { id: crypto.randomUUID(), label: "", order };
}

export default function DayManager({
  days,
  onChange,
  getCellCountForDay,
}: {
  days: TimetableDayDef[];
  onChange: (days: TimetableDayDef[]) => void;
  /** Number of filled cells referencing this day, if it's already live — omit when nothing exists yet. */
  getCellCountForDay?: (dayId: string) => number;
}) {
  const [pendingDelete, setPendingDelete] = useState<TimetableDayDef | null>(null);
  const error = validateDays(days);

  function reorder(next: TimetableDayDef[]) {
    onChange(next.map((d, i) => ({ ...d, order: i })));
  }

  function addDay() {
    reorder([...days, newDay(days.length)]);
  }

  function renameDay(id: string, label: string) {
    onChange(days.map((d) => (d.id === id ? { ...d, label } : d)));
  }

  function moveDay(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next);
  }

  function requestRemove(day: TimetableDayDef) {
    if (days.length <= 1) return;
    const cellCount = getCellCountForDay?.(day.id) ?? 0;
    if (cellCount > 0) {
      setPendingDelete(day);
      return;
    }
    reorder(days.filter((d) => d.id !== day.id));
  }

  function confirmRemove() {
    if (!pendingDelete) return;
    reorder(days.filter((d) => d.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {days.map((day, index) => (
          <div
            key={day.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-gray-200 p-2"
          >
            <input
              value={day.label}
              onChange={(e) => renameDay(day.id, e.target.value)}
              placeholder="e.g. Monday"
              className={inputClass}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveDay(index, -1)}
                disabled={index === 0}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveDay(index, 1)}
                disabled={index === days.length - 1}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Move down"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => requestRemove(day)}
                disabled={days.length <= 1}
                title={days.length <= 1 ? "At least one working day is required" : undefined}
                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        + Add day
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {pendingDelete && (
        <ConfirmDialog
          title="Remove day?"
          message={`"${pendingDelete.label || "This day"}" has ${getCellCountForDay?.(pendingDelete.id) ?? 0} filled cell(s). Removing it will delete that data.`}
          confirmLabel="Remove day"
          danger
          onConfirm={confirmRemove}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

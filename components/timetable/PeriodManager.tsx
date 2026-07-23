"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { TimetablePeriodDef } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function validatePeriods(periods: TimetablePeriodDef[]): string | null {
  if (periods.length === 0) return "Add at least one period.";
  if (periods.some((p) => !p.label.trim())) return "Every period needs a label.";
  const seen = new Set<string>();
  for (const period of periods) {
    const key = period.label.trim().toLowerCase();
    if (seen.has(key)) return `Duplicate period name: "${period.label.trim()}".`;
    seen.add(key);
  }
  return null;
}

function newPeriod(order: number): TimetablePeriodDef {
  return { id: crypto.randomUUID(), label: "", order };
}

export default function PeriodManager({
  periods,
  onChange,
  getCellCountForPeriod,
}: {
  periods: TimetablePeriodDef[];
  onChange: (periods: TimetablePeriodDef[]) => void;
  /** Number of filled cells referencing this period, if it's already live — omit in the builder. */
  getCellCountForPeriod?: (periodId: string) => number;
}) {
  const [pendingDelete, setPendingDelete] = useState<TimetablePeriodDef | null>(null);
  const error = validatePeriods(periods);

  function reorder(next: TimetablePeriodDef[]) {
    onChange(next.map((p, i) => ({ ...p, order: i })));
  }

  function addPeriod() {
    reorder([...periods, newPeriod(periods.length)]);
  }

  function updatePeriod<K extends keyof TimetablePeriodDef>(
    id: string,
    key: K,
    value: TimetablePeriodDef[K]
  ) {
    onChange(periods.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }

  function movePeriod(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= periods.length) return;
    const next = [...periods];
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next);
  }

  function requestRemove(period: TimetablePeriodDef) {
    if (periods.length <= 1) return;
    const cellCount = getCellCountForPeriod?.(period.id) ?? 0;
    if (cellCount > 0) {
      setPendingDelete(period);
      return;
    }
    reorder(periods.filter((p) => p.id !== period.id));
  }

  function confirmRemove() {
    if (!pendingDelete) return;
    reorder(periods.filter((p) => p.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {periods.map((period, index) => (
          <div
            key={period.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-gray-200 p-2"
          >
            <input
              value={period.label}
              onChange={(e) => updatePeriod(period.id, "label", e.target.value)}
              placeholder="e.g. Period 1"
              className={inputClass}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => movePeriod(index, -1)}
                disabled={index === 0}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => movePeriod(index, 1)}
                disabled={index === periods.length - 1}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Move down"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => requestRemove(period)}
                disabled={periods.length <= 1}
                title={periods.length <= 1 ? "At least one period is required" : undefined}
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
        onClick={addPeriod}
        className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        + Add period
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {pendingDelete && (
        <ConfirmDialog
          title="Remove period?"
          message={`"${pendingDelete.label || "This period"}" has ${getCellCountForPeriod?.(pendingDelete.id) ?? 0} filled cell(s) across the timetable. Removing it will delete that data.`}
          confirmLabel="Remove period"
          danger
          onConfirm={confirmRemove}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

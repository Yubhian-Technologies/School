"use client";

import type { TimetableBreakDef, TimetablePeriodDef } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function validateBreaks(breaks: TimetableBreakDef[]): string | null {
  if (breaks.some((b) => !b.label.trim())) return "Every break needs a label.";
  if (breaks.some((b) => !(b.durationMinutes > 0))) return "Break duration must be greater than 0.";
  return null;
}

function newBreak(afterPeriodId: string | null): TimetableBreakDef {
  return { id: crypto.randomUUID(), label: "", durationMinutes: 15, afterPeriodId };
}

export default function BreakManager({
  breaks,
  periods,
  onChange,
}: {
  breaks: TimetableBreakDef[];
  periods: TimetablePeriodDef[];
  onChange: (breaks: TimetableBreakDef[]) => void;
}) {
  const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);
  const error = validateBreaks(breaks);

  function updateBreak<K extends keyof TimetableBreakDef>(
    id: string,
    key: K,
    value: TimetableBreakDef[K]
  ) {
    onChange(breaks.map((b) => (b.id === id ? { ...b, [key]: value } : b)));
  }

  function addBreak() {
    const lastPeriodId = sortedPeriods.length > 0 ? sortedPeriods[sortedPeriods.length - 1].id : null;
    onChange([...breaks, newBreak(lastPeriodId)]);
  }

  function removeBreak(id: string) {
    onChange(breaks.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {breaks.length === 0 && (
          <p className="text-sm text-gray-500">No breaks yet — add one below.</p>
        )}
        {breaks.map((brk) => (
          <div key={brk.id} className="space-y-2 rounded-lg border border-gray-200 p-2">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input
                value={brk.label}
                onChange={(e) => updateBreak(brk.id, "label", e.target.value)}
                placeholder="e.g. Lunch Break"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeBreak(brk.id)}
                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500">Duration (min)</label>
                <input
                  type="number"
                  min={1}
                  value={brk.durationMinutes}
                  onChange={(e) => updateBreak(brk.id, "durationMinutes", Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Insert after</label>
                <select
                  value={brk.afterPeriodId ?? ""}
                  onChange={(e) => updateBreak(brk.id, "afterPeriodId", e.target.value || null)}
                  className={inputClass}
                >
                  <option value="">Start of day</option>
                  {sortedPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label || "(untitled period)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBreak}
        className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        + Add break
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

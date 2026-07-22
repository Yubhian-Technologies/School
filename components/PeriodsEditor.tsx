"use client";

import { useEffect, useState } from "react";
import { savePeriods, subscribeToPeriods } from "@/lib/timetableConfig";
import type { PeriodColumn, PeriodType } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-xs font-medium text-gray-500";

function newPeriod(): PeriodColumn {
  return {
    id: crypto.randomUUID(),
    label: "",
    startTime: "",
    endTime: "",
    type: "period",
  };
}

export default function PeriodsEditor({ schoolId }: { schoolId: string }) {
  const [periods, setPeriods] = useState<PeriodColumn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return subscribeToPeriods(schoolId, (config) => {
      setPeriods(config?.periods ?? []);
    });
  }, [schoolId]);

  function updatePeriod<K extends keyof PeriodColumn>(id: string, key: K, value: PeriodColumn[K]) {
    setSaved(false);
    setPeriods((rows) => rows?.map((p) => (p.id === id ? { ...p, [key]: value } : p)) ?? rows);
  }

  function addPeriod() {
    setSaved(false);
    setPeriods((rows) => [...(rows ?? []), newPeriod()]);
  }

  function removePeriod(id: string) {
    if (!window.confirm("Remove this column? This can't be undone.")) return;
    setSaved(false);
    setPeriods((rows) => rows?.filter((p) => p.id !== id) ?? rows);
  }

  function movePeriod(index: number, direction: -1 | 1) {
    setSaved(false);
    setPeriods((rows) => {
      if (!rows) return rows;
      const target = index + direction;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!periods) return;
    setError(null);
    setSaving(true);
    try {
      await savePeriods({ schoolId, periods });
      setSaved(true);
    } catch {
      setError("Could not save the period schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (periods === null) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {periods.length === 0 && (
          <p className="text-sm text-gray-500">No columns yet — add one below.</p>
        )}
        {periods.map((period, index) => (
          <div
            key={period.id}
            className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-lg border border-gray-200 p-2"
          >
            <div>
              <label className={labelClass}>Label</label>
              <input
                value={period.label}
                onChange={(e) => updatePeriod(period.id, "label", e.target.value)}
                placeholder="Period 1"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Start</label>
              <input
                type="time"
                value={period.startTime}
                onChange={(e) => updatePeriod(period.id, "startTime", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End</label>
              <input
                type="time"
                value={period.endTime}
                onChange={(e) => updatePeriod(period.id, "endTime", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={period.type}
                onChange={(e) => updatePeriod(period.id, "type", e.target.value as PeriodType)}
                className={inputClass}
              >
                <option value="period">Period</option>
                <option value="break">Break</option>
              </select>
            </div>
            <div className="flex items-center gap-1 pb-0.5">
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
                onClick={() => removePeriod(period.id)}
                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
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
        + Add period column
      </button>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && !error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved ✓</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

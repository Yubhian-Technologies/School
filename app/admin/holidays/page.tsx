"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import {
  declareHoliday,
  deleteHoliday,
  isDefaultHoliday,
  subscribeToHolidaysForRange,
} from "@/lib/holidays";
import type { AttendanceSession, Holiday, HolidayType } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${pad(month + 1)}-01`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
  return { start, end, daysInMonth };
}

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "long",
  });
}

export default function AdminHolidaysPage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayType, setHolidayType] = useState<HolidayType>("FULL_DAY");
  const [cancelledSession, setCancelledSession] = useState<AttendanceSession>("AFTERNOON");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { start, end, daysInMonth } = monthBounds(viewDate.year, viewDate.month);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToHolidaysForRange(schoolId, start, end, setHolidays);
  }, [schoolId, start, end]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of holidays ?? []) map.set(h.date, h);
    return map;
  }, [holidays]);

  const sortedHolidays = useMemo(
    () => [...(holidays ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays]
  );

  function changeMonth(delta: number) {
    setViewDate((v) => {
      const next = new Date(v.year, v.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function openDayModal(dateStr: string) {
    const existing = holidaysByDate.get(dateStr);
    setSelectedDate(dateStr);
    setHolidayType(existing?.type ?? "FULL_DAY");
    setCancelledSession(existing?.cancelledSession ?? "AFTERNOON");
    setReason(existing?.reason ?? (isDefaultHoliday(dateStr) ? "Sunday" : ""));
    setError(null);
  }

  function closeDayModal() {
    setSelectedDate(null);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!schoolId || !user || !selectedDate) return;
    if (!reason.trim()) {
      setError("Enter a reason for this holiday.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await declareHoliday({
        schoolId,
        date: selectedDate,
        type: holidayType,
        cancelledSession: holidayType === "HALF_DAY" ? cancelledSession : undefined,
        reason: reason.trim(),
        createdByUid: user.uid,
      });
      closeDayModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!schoolId || !selectedDate) return;
    if (!window.confirm(`Remove the holiday declared for ${formatDate(selectedDate)}?`)) return;
    setSaving(true);
    try {
      await deleteHoliday(schoolId, selectedDate);
      closeDayModal();
    } finally {
      setSaving(false);
    }
  }

  const leadingBlanks = new Date(viewDate.year, viewDate.month, 1).getDay();
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const existingForSelected = selectedDate ? holidaysByDate.get(selectedDate) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Holidays"
        subtitle="Declare public holidays, vacations, or sudden/emergency closures for the whole school"
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-gray-900">
            {MONTH_LABEL.format(new Date(viewDate.year, viewDate.month, 1))}
          </p>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {holidays === null ? (
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
              const holiday = holidaysByDate.get(dateStr);
              const isSunday = isDefaultHoliday(dateStr);
              const isHoliday = Boolean(holiday) || isSunday;
              return (
                <button
                  key={day}
                  onClick={() => openDayModal(dateStr)}
                  className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors hover:bg-gray-50 ${
                    isHoliday ? "bg-amber-50 text-amber-900" : "text-gray-900"
                  }`}
                >
                  <span>{day}</span>
                  {isHoliday && (
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {holiday?.type === "HALF_DAY" ? "Half" : "Holiday"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Every Sunday is a holiday by default. Click any date to declare, edit, or remove a holiday.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900">Declared this month</h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {sortedHolidays.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-500">
              No holidays declared this month (besides Sundays).
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedHolidays.map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{formatDate(h.date)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {h.type === "FULL_DAY"
                        ? "Full Day"
                        : `Half Day — ${h.cancelledSession === "MORNING" ? "Morning" : "Afternoon"} cancelled`}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{h.reason}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openDayModal(h.date)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedDate && (
        <Modal title={formatDate(selectedDate)} onClose={() => (saving ? null : closeDayModal())}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setHolidayType("FULL_DAY")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  holidayType === "FULL_DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Full-Day Holiday
              </button>
              <button
                type="button"
                onClick={() => setHolidayType("HALF_DAY")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  holidayType === "HALF_DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Half Day
              </button>
            </div>

            {holidayType === "HALF_DAY" && (
              <div>
                <label className={labelClass}>Which session is cancelled?</label>
                <select
                  value={cancelledSession}
                  onChange={(e) => setCancelledSession(e.target.value as AttendanceSession)}
                  className={inputClass}
                >
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Reason *</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Independence Day, Summer Vacation, Heavy Rain"
                className={inputClass}
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              {existingForSelected && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={closeDayModal}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving ? "Saving…" : existingForSelected ? "Save Changes" : "Declare Holiday"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

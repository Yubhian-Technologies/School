"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { ToastStack, useToastStack } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  datesInRange,
  declareHoliday,
  declareHolidayRange,
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

function ymd(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function monthBounds(year: number, month: number) {
  const start = ymd(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const end = ymd(year, month, daysInMonth);
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

function formatChip(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: d.toLocaleDateString(undefined, { day: "2-digit" }),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
  };
}

function MonthGrid({
  year,
  month,
  onChangeMonth,
  renderDay,
}: {
  year: number;
  month: number;
  onChangeMonth: (delta: number) => void;
  renderDay: (dateStr: string, day: number) => React.ReactNode;
}) {
  const { daysInMonth } = monthBounds(year, month);
  const leadingBlanks = new Date(year, month, 1).getDay();
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          aria-label="Previous month"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-gray-900">{MONTH_LABEL.format(new Date(year, month, 1))}</p>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          aria-label="Next month"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1 font-medium text-gray-400">
            {d}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {dayCells.map((day) => (
          <div key={day} className="flex items-center justify-center py-0.5">
            {renderDay(ymd(year, month, day), day)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminHolidaysPage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { start, end } = monthBounds(viewDate.year, viewDate.month);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToHolidaysForRange(
      schoolId,
      start,
      end,
      (list) => {
        setHolidays(list);
        setLoadError(null);
      },
      (err) => {
        const code = (err as { code?: string }).code;
        setLoadError(
          code === "failed-precondition"
            ? "Couldn't load holidays — Firestore needs a composite index for this query. Check the browser console for a link to create it, or see the index defined in firestore.indexes.json."
            : code === "permission-denied"
              ? "Couldn't load holidays — firestore.rules may not be published yet, or your account may not have Firebase project access."
              : `Couldn't load holidays: ${err.message}`
        );
      }
    );
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

  const { toasts, show, dismiss } = useToastStack();

  function changeMonth(delta: number) {
    setViewDate((v) => {
      const next = new Date(v.year, v.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  /** Jumps the overview grid + "Declared this month" list to whatever month
   * a date falls in, so a freshly-declared holiday is immediately visible —
   * without this, declaring a date in a month you're not currently viewing
   * looks exactly like "nothing happened", since both are scoped to
   * viewDate's month range. */
  function jumpToMonthOf(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    setViewDate({ year: d.getFullYear(), month: d.getMonth() });
  }

  // --- Quick single-day edit (clicking an already-declared day) ------------
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayType, setHolidayType] = useState<HolidayType>("FULL_DAY");
  const [cancelledSession, setCancelledSession] = useState<AttendanceSession>("AFTERNOON");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!selectedDate) return;
    if (!schoolId || !user) {
      setError("Still loading your account — please wait a moment and try again.");
      return;
    }
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
      show(`Holiday declared for ${formatDate(selectedDate)}.`);
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
      show("Holiday removed.");
      closeDayModal();
    } catch {
      show("Could not remove. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  const existingForSelected = selectedDate ? holidaysByDate.get(selectedDate) : undefined;

  // --- Declare Holiday (date-range picker) ----------------------------------
  const [declareOpen, setDeclareOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [range, setRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [declareType, setDeclareType] = useState<HolidayType>("FULL_DAY");
  const [declareSession, setDeclareSession] = useState<AttendanceSession>("AFTERNOON");
  const [declareReason, setDeclareReason] = useState("");
  const [declaring, setDeclaring] = useState(false);
  const [declareError, setDeclareError] = useState<string | null>(null);

  const isRange = Boolean(range.start && range.end && range.start !== range.end);
  const durationDays =
    range.start && range.end ? datesInRange(range.start, range.end).length : range.start ? 1 : 0;

  function openDeclareModal() {
    const now = new Date();
    setPickerDate({ year: now.getFullYear(), month: now.getMonth() });
    setRange({ start: null, end: null });
    setDeclareType("FULL_DAY");
    setDeclareReason("");
    setDeclareError(null);
    setDeclareOpen(true);
  }

  function closeDeclareModal() {
    setDeclareOpen(false);
    setDeclareError(null);
  }

  function pickRangeDate(dateStr: string) {
    setRange((r) => {
      if (!r.start || r.end) return { start: dateStr, end: null };
      if (dateStr < r.start) return { start: dateStr, end: null };
      return { start: r.start, end: dateStr };
    });
  }

  async function handleDeclareRange(e: FormEvent) {
    e.preventDefault();
    if (!range.start) return;
    if (!schoolId || !user) {
      setDeclareError("Still loading your account — please wait a moment and try again.");
      return;
    }
    if (!declareReason.trim()) {
      setDeclareError("Enter a reason for this holiday.");
      return;
    }
    setDeclareError(null);
    setDeclaring(true);
    try {
      const endDate = range.end ?? range.start;
      await declareHolidayRange({
        schoolId,
        startDate: range.start,
        endDate,
        type: declareType,
        cancelledSession: declareType === "HALF_DAY" ? declareSession : undefined,
        reason: declareReason.trim(),
        createdByUid: user.uid,
      });
      show(
        endDate === range.start
          ? `Holiday declared for ${formatDate(range.start)}.`
          : `Holiday declared for ${formatDate(range.start)} – ${formatDate(endDate)}.`
      );
      jumpToMonthOf(range.start);
      closeDeclareModal();
    } catch (err) {
      setDeclareError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setDeclaring(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Holidays"
          subtitle="Declare public holidays, vacations, or sudden/emergency closures for the whole school"
        />
        <button
          onClick={openDeclareModal}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Declare Holiday
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <MonthGrid
          year={viewDate.year}
          month={viewDate.month}
          onChangeMonth={changeMonth}
          renderDay={(dateStr, day) => {
            const holiday = holidaysByDate.get(dateStr);
            const isSunday = isDefaultHoliday(dateStr);
            return (
              <button
                type="button"
                onClick={() => openDayModal(dateStr)}
                className={`flex h-10 w-10 flex-col items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  holiday
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : isSunday
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "text-gray-900 hover:bg-gray-100"
                }`}
              >
                {day}
              </button>
            );
          }}
        />
        <p className="mt-4 text-xs text-gray-400">
          Every Sunday is a holiday by default. Click any date to declare, edit, or remove a single-day
          holiday, or use &ldquo;Declare Holiday&rdquo; above for a multi-day vacation.
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

      {/* Quick single-day edit/delete */}
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
                placeholder="e.g. Independence Day, Heavy Rain"
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

      {/* Declare Holiday — date-range picker */}
      {declareOpen && (
        <Modal title="Declare Holiday" onClose={() => (declaring ? null : closeDeclareModal())} maxWidthClassName="max-w-md">
          <form onSubmit={handleDeclareRange} className="space-y-5">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex-1 text-center">
                {range.start ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {formatChip(range.start).month}
                    </p>
                    <p className="text-xl font-bold text-gray-900">{formatChip(range.start).day}</p>
                    <p className="text-xs text-gray-400">{formatChip(range.start).weekday}</p>
                  </>
                ) : (
                  <p className="py-3 text-sm text-gray-400">Start date</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1 text-indigo-600">
                <CalendarOff className="h-4 w-4" />
                <span className="text-[11px] font-semibold">{durationDays > 0 ? `${durationDays} Day(s)` : "—"}</span>
              </div>
              <div className="flex-1 text-center">
                {range.end ?? (range.start && !isRange ? range.start : null) ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {formatChip(range.end ?? range.start!).month}
                    </p>
                    <p className="text-xl font-bold text-gray-900">{formatChip(range.end ?? range.start!).day}</p>
                    <p className="text-xs text-gray-400">{formatChip(range.end ?? range.start!).weekday}</p>
                  </>
                ) : (
                  <p className="py-3 text-sm text-gray-400">End date</p>
                )}
              </div>
            </div>

            <MonthGrid
              year={pickerDate.year}
              month={pickerDate.month}
              onChangeMonth={(delta) =>
                setPickerDate((v) => {
                  const next = new Date(v.year, v.month + delta, 1);
                  return { year: next.getFullYear(), month: next.getMonth() };
                })
              }
              renderDay={(dateStr, day) => {
                const inRange =
                  range.start && range.end && dateStr >= range.start && dateStr <= range.end;
                const isEdge = dateStr === range.start || dateStr === range.end;
                const alreadyDeclared = holidaysByDate.has(dateStr) || isDefaultHoliday(dateStr);
                return (
                  <button
                    type="button"
                    onClick={() => pickRangeDate(dateStr)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isEdge
                        ? "bg-indigo-600 text-white"
                        : inRange
                          ? "bg-indigo-100 text-indigo-700"
                          : alreadyDeclared
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {day}
                  </button>
                );
              }}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeclareType("FULL_DAY")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  declareType === "FULL_DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Full-Day
              </button>
              <button
                type="button"
                onClick={() => setDeclareType("HALF_DAY")}
                disabled={isRange}
                title={isRange ? "Half Day only applies to a single date" : undefined}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  declareType === "HALF_DAY"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Half Day
              </button>
            </div>

            {declareType === "HALF_DAY" && (
              <div>
                <label className={labelClass}>Which session is cancelled?</label>
                <select
                  value={declareSession}
                  onChange={(e) => setDeclareSession(e.target.value as AttendanceSession)}
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
                value={declareReason}
                onChange={(e) => setDeclareReason(e.target.value)}
                placeholder="e.g. Summer Vacation, Diwali Break"
                className={inputClass}
              />
            </div>

            {declareError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{declareError}</p>
            )}

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeDeclareModal}
                disabled={declaring}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={declaring || !range.start}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {declaring ? "Saving…" : "Submit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

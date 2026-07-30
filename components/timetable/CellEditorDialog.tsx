"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/Modal";
import type { Faculty, Subject, TimetableCellData } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

const emptyCell: TimetableCellData = {
  subject: "",
  facultyId: null,
  facultyName: null,
  room: "",
  notes: "",
};

export default function CellEditorDialog({
  title,
  cell,
  faculty,
  subjects,
  onSave,
  onClear,
  onClose,
}: {
  title: string;
  cell: TimetableCellData | undefined;
  faculty: Faculty[];
  /** This class's subject catalog (lib/subjects.ts) — populates the Subject dropdown below. */
  subjects: Subject[];
  onSave: (data: TimetableCellData) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TimetableCellData>(cell ?? emptyCell);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await onClear();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const hasContent = Boolean(cell?.subject || cell?.facultyId || cell?.room || cell?.notes);

  return (
    <Modal title={title} onClose={onClose} maxWidthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cell-subject" className={labelClass}>
            Subject
          </label>
          <select
            id="cell-subject"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className={inputClass}
          >
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cell-faculty" className={labelClass}>
            Faculty
          </label>
          <select
            id="cell-faculty"
            value={form.facultyId ?? ""}
            onChange={(e) => {
              const uid = e.target.value || null;
              const match = faculty.find((f) => f.uid === uid);
              setForm((f) => ({ ...f, facultyId: uid, facultyName: match?.name ?? null }));
            }}
            className={inputClass}
          >
            <option value="">No faculty assigned</option>
            {faculty.map((f) => (
              <option key={f.uid} value={f.uid}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cell-room" className={labelClass}>
            Room (optional)
          </label>
          <input
            id="cell-room"
            value={form.room}
            onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
            placeholder="e.g. Room 12"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="cell-notes" className={labelClass}>
            Notes (optional)
          </label>
          <textarea
            id="cell-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="flex gap-3 border-t border-gray-100 pt-4">
          {hasContent && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              Clear cell
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

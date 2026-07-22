"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel } from "@/lib/classes";
import { createSection, deleteSection, subscribeToSections } from "@/lib/timetableSections";
import type { TimetableSection } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

export default function ClassSectionsView({ classId }: { classId: string }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [sections, setSections] = useState<TimetableSection[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToSections(schoolId, classId, setSections);
  }, [schoolId, classId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schoolId) {
      setError("No school is associated with this account.");
      return;
    }

    setSubmitting(true);
    try {
      await createSection({ schoolId, classId, name: name.trim() });
      setName("");
      setModalOpen(false);
    } catch {
      setError("Could not add section. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(section: TimetableSection) {
    if (!window.confirm(`Delete section ${section.name}? Its timetable will be deleted too.`)) return;
    setDeletingId(section.id);
    try {
      await deleteSection(section.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/timetable" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Timetable
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            {classLabel} — Sections
          </h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Add section
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {sections === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : sections.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No sections yet — add one to get started.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sections.map((section) => (
              <li key={section.id} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={`/admin/timetable/${classId}/${section.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  Section {section.name}
                </Link>
                <button
                  onClick={() => handleDelete(section)}
                  disabled={deletingId === section.id}
                  className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                >
                  {deletingId === section.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="Add section"
          onClose={() => {
            setModalOpen(false);
            setName("");
            setError(null);
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="section-name" className={labelClass}>
                Section name
              </label>
              <input
                id="section-name"
                required
                placeholder="A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add section"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

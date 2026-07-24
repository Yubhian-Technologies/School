"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { CLASS_LIST } from "@/lib/classes";
import {
  createSubject,
  deleteSubject,
  subscribeToSubjects,
  updateSubject,
  type SubjectInput,
} from "@/lib/subjects";
import type { Subject, SubjectType } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

const SUBJECT_TYPES: SubjectType[] = ["Theory", "Practical", "Activity"];

function emptyForm(): SubjectInput {
  return { name: "", code: "", type: "Theory", hoursPerWeek: null };
}

export default function AdminSubjectsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [classId, setClassId] = useState(CLASS_LIST[0].id);
  const classLabel = useMemo(
    () => CLASS_LIST.find((c) => c.id === classId)?.label ?? CLASS_LIST[0].label,
    [classId]
  );

  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToSubjects(schoolId, classLabel, setSubjects);
  }, [schoolId, classLabel]);

  const isEditing = editingSubject !== null;

  function openAddModal() {
    setEditingSubject(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(subject: Subject) {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code ?? "",
      type: subject.type,
      hoursPerWeek: subject.hoursPerWeek ?? null,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSubject(null);
    setForm(emptyForm());
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schoolId) {
      setError("No school is associated with this account.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingSubject) {
        await updateSubject(schoolId, classLabel, editingSubject.id, form);
      } else {
        await createSubject(schoolId, classLabel, form);
      }
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Could not ${isEditing ? "update" : "add"} subject. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(subject: Subject) {
    if (!window.confirm(`Delete "${subject.name}"? This cannot be undone.`)) return;
    setDeletingId(subject.id);
    try {
      await deleteSubject(subject.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Subjects"
        subtitle="Manage subjects offered for each class — common to all sections of that class"
      />

      <div className="max-w-xs">
        <label htmlFor="class-select" className={labelClass}>
          Class
        </label>
        <select
          id="class-select"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className={inputClass}
        >
          {CLASS_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            {classLabel} · Subjects
          </p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Add Subject
          </button>
        </div>

        {subjects === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">No subjects added yet for this class.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Hours / Week</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{subject.name}</td>
                  <td className="px-5 py-3 text-gray-600">{subject.code || "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{subject.type}</td>
                  <td className="px-5 py-3 text-gray-600">{subject.hoursPerWeek ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditModal(subject)}
                        aria-label="Edit subject"
                        className="text-gray-400 transition-colors hover:text-indigo-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subject)}
                        disabled={deletingId === subject.id}
                        aria-label="Delete subject"
                        className="text-gray-400 transition-colors hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={isEditing ? "Edit Subject" : "Add Subject"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Class</label>
              <input disabled value={classLabel} className={`${inputClass} bg-gray-50 text-gray-500`} />
            </div>

            <div>
              <label htmlFor="subject-name" className={labelClass}>
                Subject Name *
              </label>
              <input
                id="subject-name"
                required
                placeholder="e.g. Mathematics"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject-code" className={labelClass}>
                  Code
                </label>
                <input
                  id="subject-code"
                  placeholder="e.g. MATH"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="subject-type" className={labelClass}>
                  Type
                </label>
                <select
                  id="subject-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SubjectType }))}
                  className={inputClass}
                >
                  {SUBJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="subject-hours" className={labelClass}>
                Hours / Week
              </label>
              <input
                id="subject-hours"
                type="number"
                min={0}
                placeholder="Optional"
                value={form.hoursPerWeek ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hoursPerWeek: e.target.value ? Number(e.target.value) : null }))
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400">For timetable planning</p>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting ? "Saving…" : isEditing ? "Save Changes" : "Add Subject"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

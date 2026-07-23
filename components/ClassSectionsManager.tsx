"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import {
  createClassSection,
  deleteClassSection,
  subscribeToAllClassSections,
  subscribeToClassSections,
  updateClassTeacher,
} from "@/lib/classSections";
import { getClassLabel } from "@/lib/classes";
import { subscribeToFaculty } from "@/lib/faculty";
import type { ClassSection, Faculty } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";
const selectClass =
  "rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function ClassSectionsManager({ classId }: { classId: string }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [sections, setSections] = useState<ClassSection[] | null>(null);
  const [allSections, setAllSections] = useState<ClassSection[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToClassSections(schoolId, classLabel, setSections);
  }, [schoolId, classLabel]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToFaculty(schoolId, setFaculty);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToAllClassSections(schoolId, setAllSections);
  }, [schoolId]);

  const sortedFaculty = useMemo(
    () => [...faculty].sort((a, b) => a.name.localeCompare(b.name)),
    [faculty]
  );

  // facultyUid -> id of the section they're currently class teacher of, across
  // every class — a faculty can be class teacher of only one section at a time.
  const teacherAssignments = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSections) {
      if (s.classTeacherUid) map.set(s.classTeacherUid, s.id);
    }
    return map;
  }, [allSections]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schoolId) {
      setError("No school is associated with this account.");
      return;
    }

    setSubmitting(true);
    try {
      await createClassSection({ schoolId, className: classLabel, sectionName: name.trim() });
      setName("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add section. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(section: ClassSection) {
    if (!window.confirm(`Delete section ${section.sectionName}?`)) return;
    setDeletingId(section.id);
    try {
      await deleteClassSection(section.id);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAssignTeacher(section: ClassSection, uid: string) {
    if (!schoolId) return;
    setAssigningId(section.id);
    try {
      await updateClassTeacher(schoolId, section.id, uid || null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not assign class teacher.");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/classes" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Classes
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
            {sections.map((section) => {
              const availableFaculty = sortedFaculty.filter((f) => {
                const assignedSectionId = teacherAssignments.get(f.uid);
                return !assignedSectionId || assignedSectionId === section.id;
              });
              return (
                <li
                  key={section.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-medium text-gray-900">Section {section.sectionName}</p>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className={labelClass}>Class Teacher</label>
                      <select
                        value={section.classTeacherUid ?? ""}
                        onChange={(e) => handleAssignTeacher(section, e.target.value)}
                        disabled={assigningId === section.id}
                        className={`${selectClass} mt-1 disabled:opacity-60`}
                      >
                        <option value="">Not assigned</option>
                        {availableFaculty.map((f) => (
                          <option key={f.uid} value={f.uid}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleDelete(section)}
                      disabled={deletingId === section.id}
                      className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                    >
                      {deletingId === section.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
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

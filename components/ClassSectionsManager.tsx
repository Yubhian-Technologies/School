"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import {
  createClassSection,
  deleteClassSection,
  getCurrentAcademicYear,
  subscribeToAllClassSections,
  subscribeToClassSections,
  updateClassSection,
} from "@/lib/classSections";
import { getClassLabel } from "@/lib/classes";
import { subscribeToFaculty } from "@/lib/faculty";
import type { ClassSection, Faculty } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

interface SectionFormState {
  sectionName: string;
  academicYear: string;
  studentIntake: string;
  classTeacherUid: string;
}

function emptyForm(): SectionFormState {
  return { sectionName: "", academicYear: getCurrentAcademicYear(), studentIntake: "", classTeacherUid: "" };
}

export default function ClassSectionsManager({ classId }: { classId: string }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [sections, setSections] = useState<ClassSection[] | null>(null);
  const [allSections, setAllSections] = useState<ClassSection[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ClassSection | null>(null);
  const [form, setForm] = useState<SectionFormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const facultyName = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of faculty) map.set(f.uid, f.name);
    return map;
  }, [faculty]);

  const isEditing = editingSection !== null;
  const totalIntake = (sections ?? []).reduce((sum, s) => sum + (s.studentIntake ?? 0), 0);
  const withoutTeacher = (sections ?? []).filter((s) => !s.classTeacherUid).length;

  function availableFacultyFor(sectionId?: string) {
    return sortedFaculty.filter((f) => {
      const assignedSectionId = teacherAssignments.get(f.uid);
      return !assignedSectionId || assignedSectionId === sectionId;
    });
  }

  function openAddModal() {
    setEditingSection(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(section: ClassSection) {
    setEditingSection(section);
    setForm({
      sectionName: section.sectionName,
      academicYear: section.academicYear,
      studentIntake: section.studentIntake ? String(section.studentIntake) : "",
      classTeacherUid: section.classTeacherUid ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSection(null);
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

    const studentIntake = form.studentIntake.trim() ? Number(form.studentIntake) : null;

    setSubmitting(true);
    try {
      if (isEditing && editingSection) {
        await updateClassSection(schoolId, editingSection.id, {
          sectionName: form.sectionName,
          academicYear: form.academicYear,
          studentIntake,
          classTeacherUid: form.classTeacherUid || null,
        });
      } else {
        await createClassSection({
          schoolId,
          className: classLabel,
          sectionName: form.sectionName,
          academicYear: form.academicYear,
          studentIntake,
          classTeacherUid: form.classTeacherUid || null,
        });
      }
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Could not ${isEditing ? "update" : "add"} section. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(section: ClassSection) {
    if (!window.confirm(`Delete section ${section.sectionName}? This cannot be undone.`)) return;
    setDeletingId(section.id);
    try {
      await deleteClassSection(section.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Classes
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{classLabel} · Sections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage sections, assign a class teacher, and track student intake
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Section
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-gray-900">{sections?.length ?? "—"}</span> sections
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-gray-900">{totalIntake}</span> student intake total
        </span>
        <span className="flex items-center gap-1.5">
          <UserRound className="h-4 w-4 text-orange-500" />
          <span className="font-semibold text-gray-900">{withoutTeacher}</span> without a class teacher
        </span>
      </div>

      {sections === null ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Loading…
        </p>
      ) : sections.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No sections yet — add one to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">Section {section.sectionName}</p>
                  <p className="text-xs text-gray-400">{section.academicYear}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(section)}
                    aria-label="Edit section"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-indigo-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(section)}
                    disabled={deletingId === section.id}
                    aria-label="Delete section"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
                  {section.classTeacherUid ? (
                    <span className="font-medium text-gray-800">
                      {facultyName.get(section.classTeacherUid) ?? "Unknown faculty"}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-600">Not assigned</span>
                  )}
                </p>
                {section.studentIntake ? (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    {section.studentIntake} students (intake)
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={isEditing ? "Edit Section" : "Add New Section"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Class</label>
              <input disabled value={classLabel} className={`${inputClass} bg-gray-50 text-gray-500`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="section-name" className={labelClass}>
                  Section Name *
                </label>
                <input
                  id="section-name"
                  required
                  placeholder="A, B, C…"
                  value={form.sectionName}
                  onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="section-year" className={labelClass}>
                  Academic Year *
                </label>
                <input
                  id="section-year"
                  required
                  placeholder="e.g. 2026-2027"
                  value={form.academicYear}
                  onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="section-intake" className={labelClass}>
                Student Intake
              </label>
              <input
                id="section-intake"
                type="number"
                min={0}
                placeholder="e.g. 40"
                value={form.studentIntake}
                onChange={(e) => setForm((f) => ({ ...f, studentIntake: e.target.value }))}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400">Planned seats for this section</p>
            </div>

            <div>
              <label htmlFor="section-teacher" className={labelClass}>
                Class Teacher
              </label>
              <select
                id="section-teacher"
                value={form.classTeacherUid}
                onChange={(e) => setForm((f) => ({ ...f, classTeacherUid: e.target.value }))}
                className={inputClass}
              >
                <option value="">— Not assigned —</option>
                {availableFacultyFor(editingSection?.id).map((f) => (
                  <option key={f.uid} value={f.uid}>
                    {f.name}
                  </option>
                ))}
              </select>
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
                {submitting ? "Saving…" : isEditing ? "Save Changes" : "Create Section"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

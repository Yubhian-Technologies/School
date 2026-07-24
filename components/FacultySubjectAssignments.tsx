"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import { CLASS_LIST, getClassLabel } from "@/lib/classes";
import { subscribeToClassSections } from "@/lib/classSections";
import {
  assignSubjectTeacher,
  subscribeToTeacherAssignmentsForFaculty,
  subscribeToTeacherAssignmentsForSection,
  unassignSubjectTeacher,
} from "@/lib/facultyAssignments";
import { subscribeToSubjects } from "@/lib/subjects";
import type { ClassSection, Faculty, FacultyAssignment, Subject } from "@/lib/types";

const selectClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-xs font-medium text-gray-500";

export default function FacultySubjectAssignments({
  schoolId,
  faculty,
  onClose,
}: {
  schoolId: string;
  faculty: Faculty;
  onClose: () => void;
}) {
  const [assignments, setAssignments] = useState<FacultyAssignment[] | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [classId, setClassId] = useState(CLASS_LIST[0].id);
  const classLabel = getClassLabel(classId);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [sectionAssignments, setSectionAssignments] = useState<FacultyAssignment[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToTeacherAssignmentsForFaculty(schoolId, faculty.uid, setAssignments);
  }, [schoolId, faculty.uid]);

  useEffect(() => {
    return subscribeToClassSections(schoolId, classLabel, setSections);
  }, [schoolId, classLabel]);

  useEffect(() => {
    return subscribeToSubjects(schoolId, classLabel, setSubjects);
  }, [schoolId, classLabel]);

  useEffect(() => {
    if (!sectionId) return;
    return subscribeToTeacherAssignmentsForSection(schoolId, sectionId, setSectionAssignments);
  }, [schoolId, sectionId]);

  function handleClassChange(newClassId: string) {
    setClassId(newClassId);
    setSectionId("");
    setSubjectId("");
  }

  function handleSectionChange(newSectionId: string) {
    setSectionId(newSectionId);
    setSubjectId("");
    setSectionAssignments([]);
  }

  const takenBySubjectId = useMemo(() => {
    const map = new Map<string, string>();
    if (!sectionId) return map;
    for (const a of sectionAssignments) {
      if (a.subjectId && a.facultyUid !== faculty.uid) map.set(a.subjectId, a.facultyName ?? "another faculty");
    }
    return map;
  }, [sectionAssignments, faculty.uid, sectionId]);

  const section = sections.find((s) => s.id === sectionId) ?? null;
  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const alreadyAssignedToThisFaculty =
    !!section && !!subject && assignments?.some((a) => a.classSectionId === section.id && a.subjectId === subject.id);

  async function handleAdd() {
    if (!section || !subject) return;
    setError(null);

    const takenBy = takenBySubjectId.get(subject.id);
    if (takenBy && !window.confirm(`${subject.name} in ${classLabel} ${section.sectionName} is currently assigned to ${takenBy}. Reassign it to ${faculty.name}?`)) {
      return;
    }

    setAdding(true);
    try {
      await assignSubjectTeacher({
        schoolId,
        classSectionId: section.id,
        className: classLabel,
        sectionName: section.sectionName,
        subjectId: subject.id,
        subjectName: subject.name,
        facultyUid: faculty.uid,
        facultyName: faculty.name,
      });
      setSubjectId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this assignment. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(a: FacultyAssignment) {
    if (!a.subjectId) return;
    setRemovingId(a.id);
    try {
      await unassignSubjectTeacher(a.classSectionId, a.subjectId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Modal title={`Subjects & Classes — ${faculty.name}`} onClose={onClose} maxWidthClassName="max-w-lg">
      <p className="text-sm text-gray-500">
        Assign the classes and subjects this faculty member teaches. This drives what shows up on their
        Faculty Dashboard, and which classes they can post Classwork/Homework for.
      </p>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Currently Assigned</h3>
        {assignments === null ? (
          <p className="mt-2 text-sm text-gray-500">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No subjects assigned yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-gray-800">
                  <BookOpen className="h-4 w-4 shrink-0 text-indigo-500" />
                  {a.subjectName} <span className="text-gray-400">— {a.className} {a.sectionName}</span>
                </span>
                <button
                  onClick={() => handleRemove(a)}
                  disabled={removingId === a.id}
                  aria-label="Remove assignment"
                  className="text-gray-400 transition-colors hover:text-red-600 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add Subject</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Class</label>
            <select value={classId} onChange={(e) => handleClassChange(e.target.value)} className={selectClass}>
              {CLASS_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Section</label>
            <select
              value={sectionId}
              onChange={(e) => handleSectionChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sectionName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {takenBySubjectId.has(s.id) ? ` (${takenBySubjectId.get(s.id)})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!section || !subject || adding || alreadyAssignedToThisFaculty}
          className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {alreadyAssignedToThisFaculty
            ? "Already assigned"
            : adding
            ? "Adding…"
            : "Add Subject"}
        </button>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

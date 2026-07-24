"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  uploadAssignmentAttachment,
  upsertAssignmentEntry,
  subscribeToAssignmentsForTeacherSubject,
} from "@/lib/assignments";
import { subscribeToFacultyAssignment } from "@/lib/facultyAssignments";
import type { Assignment, FacultyAssignment } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return { date: todayIso(), classwork: "", homework: "", dueDate: "" };
}

export default function SubjectAssignmentDiaryPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = use(params);
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [assignment, setAssignment] = useState<FacultyAssignment | null | undefined>(undefined);
  const [entries, setEntries] = useState<Assignment[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return subscribeToFacultyAssignment(assignmentId, setAssignment);
  }, [assignmentId]);

  useEffect(() => {
    if (!schoolId || !assignment) return;
    return subscribeToAssignmentsForTeacherSubject(schoolId, assignment.classSectionId, assignment.subjectId!, setEntries);
  }, [schoolId, assignment]);

  const existingForDate = useMemo(
    () => entries.find((e) => e.date === form.date) ?? null,
    [entries, form.date]
  );

  function loadEntry(entry: Assignment) {
    setSaved(false);
    setError(null);
    setForm({
      date: entry.date,
      classwork: entry.classwork ?? "",
      homework: entry.homework ?? "",
      dueDate: entry.dueDate ?? "",
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!schoolId || !assignment || !profile?.uid) return;

    setSubmitting(true);
    try {
      let attachmentUrl = existingForDate?.attachmentUrl;
      let attachmentName = existingForDate?.attachmentName;
      if (attachmentFile) {
        attachmentUrl = await uploadAssignmentAttachment(schoolId, attachmentFile);
        attachmentName = attachmentFile.name;
      }

      await upsertAssignmentEntry({
        schoolId,
        classSectionId: assignment.classSectionId,
        className: assignment.className ?? "",
        sectionName: assignment.sectionName ?? "",
        subjectId: assignment.subjectId!,
        subjectName: assignment.subjectName ?? "",
        facultyUid: profile.uid,
        date: form.date,
        classwork: form.classwork,
        homework: form.homework,
        dueDate: form.dueDate || undefined,
        attachmentUrl,
        attachmentName,
      });
      setAttachmentFile(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (assignment === undefined) {
    return <p className="p-16 text-center text-sm text-gray-500">Loading…</p>;
  }

  if (assignment === null) {
    return <p className="p-16 text-center text-sm text-gray-500">This assignment slot doesn&apos;t exist.</p>;
  }

  if (assignment.facultyUid !== profile?.uid) {
    return (
      <p className="p-16 text-center text-sm text-gray-500">
        You&apos;re not the Subject Teacher assigned to this class-section.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/faculty/subject/assignments"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" /> Assignments
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
          {assignment.subjectName} — {assignment.className} {assignment.sectionName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Post today&apos;s Classwork and Homework — visible to every parent in this section.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="entry-date" className={labelClass}>
              Date
            </label>
            <input
              id="entry-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => {
                setSaved(false);
                setForm((f) => ({ ...f, date: e.target.value }));
              }}
              className={`${inputClass} max-w-xs`}
            />
            {existingForDate && (
              <p className="mt-1 text-xs text-amber-600">
                An entry already exists for this date — saving will update it.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="entry-classwork" className={labelClass}>
              Classwork
            </label>
            <textarea
              id="entry-classwork"
              rows={3}
              placeholder="What was taught in class today"
              value={form.classwork}
              onChange={(e) => setForm((f) => ({ ...f, classwork: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="entry-homework" className={labelClass}>
              Homework
            </label>
            <textarea
              id="entry-homework"
              rows={3}
              placeholder="What students need to complete"
              value={form.homework}
              onChange={(e) => setForm((f) => ({ ...f, homework: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="entry-due" className={labelClass}>
                Due Date
              </label>
              <input
                id="entry-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="entry-attachment" className={labelClass}>
                Attachment
              </label>
              <input
                id="entry-attachment"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                className={`${inputClass} py-1.5`}
              />
              {existingForDate?.attachmentName && !attachmentFile && (
                <p className="mt-1 truncate text-xs text-gray-500">
                  Current: {existingForDate.attachmentName}
                </p>
              )}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {saved && !error && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save Entry"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700">Past Entries</h2>
        {entries.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            No entries posted yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => loadEntry(entry)}
                onKeyDown={(e) => e.key === "Enter" && loadEntry(entry)}
                className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-indigo-300"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{entry.date}</p>
                  {entry.attachmentUrl && (
                    <a
                      href={entry.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
                    >
                      <Paperclip className="h-3 w-3" /> {entry.attachmentName}
                    </a>
                  )}
                </div>
                {entry.classwork && (
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Classwork:</span> {entry.classwork}
                  </p>
                )}
                {entry.homework && (
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Homework:</span> {entry.homework}
                  </p>
                )}
                {entry.dueDate && (
                  <p className="mt-1 text-xs text-amber-600">Due {entry.dueDate}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { subscribeToAssignmentsForSection } from "@/lib/assignments";
import { subscribeToLinkedStudent } from "@/lib/students";
import type { Assignment, Student } from "@/lib/types";

export default function ParentAssignmentsPage() {
  const { profile } = useAuth();

  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [entries, setEntries] = useState<Assignment[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLinkedStudent(profile.uid, setStudent);
  }, [profile?.uid]);

  useEffect(() => {
    if (!student) return;
    return subscribeToAssignmentsForSection(student.schoolId, student.classSectionId, setEntries);
  }, [student]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments"
        subtitle="Classwork & Homework posted by your child's subject teachers"
      />

      {student === undefined || (student && entries === null) ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Loading…
        </p>
      ) : student === null ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No student is linked to this account yet.
        </p>
      ) : entries !== null && entries.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No assignments posted yet.
        </p>
      ) : (
        <div className="space-y-3">
          {entries?.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {entry.subjectName} <span className="font-normal text-gray-400">· {entry.date}</span>
                </p>
                {entry.dueDate && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Due {entry.dueDate}
                  </span>
                )}
              </div>
              {entry.classwork && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Classwork:</span> {entry.classwork}
                </p>
              )}
              {entry.homework && (
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Homework:</span> {entry.homework}
                </p>
              )}
              {entry.attachmentUrl && (
                <a
                  href={entry.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
                >
                  <Paperclip className="h-3 w-3" /> {entry.attachmentName}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

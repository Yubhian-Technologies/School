"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTeacherAssignmentsForFaculty } from "@/lib/facultyAssignments";
import type { FacultyAssignment } from "@/lib/types";

export default function SubjectTeacherAssignmentsLandingPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [assignments, setAssignments] = useState<FacultyAssignment[] | null>(null);

  useEffect(() => {
    if (!schoolId || !profile?.uid) return;
    return subscribeToTeacherAssignmentsForFaculty(schoolId, profile.uid, setAssignments);
  }, [schoolId, profile?.uid]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments"
        subtitle="Post Classwork & Homework for the classes you're assigned to teach"
      />

      {assignments === null ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Loading…
        </p>
      ) : assignments.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Your Admin hasn&apos;t assigned you as a Subject Teacher yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <Link
              key={a.id}
              href={`/faculty/subject/assignments/${a.id}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                <BookOpen className="h-4 w-4" />
                {a.subjectName}
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {a.className} · {a.sectionName}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

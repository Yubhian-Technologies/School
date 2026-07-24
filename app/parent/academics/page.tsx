"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToLinkedStudent } from "@/lib/students";
import PublishedTimetableView from "@/components/timetable/PublishedTimetableView";
import type { Student } from "@/lib/types";

export default function ParentAcademicsPage() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLinkedStudent(profile.uid, setStudent);
  }, [profile?.uid]);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">Academics</h1>

      {student === undefined ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : student === null ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No student linked to your account yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            {student.name}
            {student.className && ` · ${student.className} - ${student.sectionName}`}
          </h2>
          <PublishedTimetableView schoolId={student.schoolId} sectionId={student.classSectionId} />
        </div>
      )}
    </div>
  );
}

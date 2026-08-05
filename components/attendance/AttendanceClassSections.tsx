"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel } from "@/lib/classes";
import { subscribeToClassSections } from "@/lib/classSections";
import { subscribeToFaculty } from "@/lib/faculty";
import type { ClassSection, Faculty } from "@/lib/types";

export default function AttendanceClassSections({ classId }: { classId: string }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [sections, setSections] = useState<ClassSection[] | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToClassSections(schoolId, classLabel, setSections);
  }, [schoolId, classLabel]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToFaculty(schoolId, setFaculty);
  }, [schoolId]);

  const teacherName = (uid: string | null) => faculty.find((f) => f.uid === uid)?.name;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/attendance" className="text-sm text-indigo-600 hover:text-indigo-500">
          ← Attendance
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
          {classLabel} — Sections
        </h1>
      </div>

      {sections === null ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Loading…
        </p>
      ) : sections.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No sections yet.{" "}
          <Link href="/admin/classes" className="text-indigo-600 hover:text-indigo-500">
            Add one under Classes →
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/admin/attendance/${classId}/${section.id}`}
              className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-gray-900">Section {section.sectionName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <UserRound className="h-3.5 w-3.5" />
                  {teacherName(section.classTeacherUid) ?? "No class teacher"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

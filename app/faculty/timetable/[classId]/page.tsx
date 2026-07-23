"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel, CLASS_LIST } from "@/lib/classes";
import { subscribeToClassSections } from "@/lib/classSections";
import type { ClassSection } from "@/lib/types";

export default function FacultyClassTimetablePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [sections, setSections] = useState<ClassSection[] | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToClassSections(schoolId, classLabel, setSections);
  }, [schoolId, classLabel]);

  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return (
    <div>
      <Link href="/faculty/timetable" className="text-sm text-indigo-600 hover:text-indigo-500">
        ← Timetable
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
        {classLabel} — Sections
      </h1>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {sections === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : sections.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">No sections yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sections.map((section) => (
              <li key={section.id}>
                <Link
                  href={`/faculty/timetable/${classId}/${section.id}`}
                  className="block px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 hover:text-indigo-600"
                >
                  Section {section.sectionName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

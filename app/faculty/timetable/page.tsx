"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { CLASS_LIST } from "@/lib/classes";
import type { ClassSection } from "@/lib/types";

export default function FacultyTimetablePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null>(null);

  useEffect(() => {
    if (!schoolId || !profile?.uid) return;
    return subscribeToClassSectionForTeacher(schoolId, profile.uid, setMySection);
  }, [schoolId, profile?.uid]);

  const myClassId = mySection
    ? (CLASS_LIST.find((c) => c.label === mySection.className)?.id ?? mySection.className)
    : null;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">Timetable</h1>

      {mySection && myClassId && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">My Section</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <Link
              href={`/faculty/timetable/${myClassId}/${mySection.id}`}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-center text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:border-indigo-300"
            >
              {mySection.className} - {mySection.sectionName}
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">All Classes</h2>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {CLASS_LIST.map((cls) => (
            <Link
              key={cls.id}
              href={`/faculty/timetable/${cls.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-700"
            >
              {cls.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

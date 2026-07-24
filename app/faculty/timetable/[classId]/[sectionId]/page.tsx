"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel, CLASS_LIST } from "@/lib/classes";
import PublishedTimetableView from "@/components/timetable/PublishedTimetableView";

export default function FacultySectionTimetablePage({
  params,
}: {
  params: Promise<{ classId: string; sectionId: string }>;
}) {
  const { classId, sectionId } = use(params);
  const { profile } = useAuth();
  const classLabel = getClassLabel(classId);

  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return (
    <div>
      <Link
        href={`/faculty/timetable/${classId}`}
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← {classLabel} sections
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{classLabel}</h1>

      <div className="mt-6">
        <PublishedTimetableView
          schoolId={profile?.schoolId}
          sectionId={sectionId}
          highlightFacultyId={profile?.uid}
        />
      </div>
    </div>
  );
}

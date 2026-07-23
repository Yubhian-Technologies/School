"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap, Layers, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { subscribeToAllClassSections } from "@/lib/classSections";
import { CLASS_LIST } from "@/lib/classes";
import type { ClassSection } from "@/lib/types";

export default function AdminClassesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [sections, setSections] = useState<ClassSection[] | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToAllClassSections(schoolId, setSections);
  }, [schoolId]);

  const byClass = useMemo(() => {
    const map = new Map<string, ClassSection[]>();
    for (const s of sections ?? []) {
      map.set(s.className, [...(map.get(s.className) ?? []), s]);
    }
    return map;
  }, [sections]);

  const withoutTeacher = (sections ?? []).filter((s) => !s.classTeacherUid).length;

  return (
    <div className="space-y-8">
      <PageHeader title="Classes" subtitle="Nursery to Class 10 — manage sections for each class" />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-gray-900">{CLASS_LIST.length}</span> classes
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-gray-900">{sections === null ? "—" : sections.length}</span> sections total
        </span>
        <span className="flex items-center gap-1.5">
          <UserRound className="h-4 w-4 text-orange-500" />
          <span className="font-semibold text-gray-900">{sections === null ? "—" : withoutTeacher}</span> without a class teacher
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {CLASS_LIST.map((cls) => {
          const classSections = byClass.get(cls.label) ?? [];
          return (
            <Link
              key={cls.id}
              href={`/admin/classes/${cls.id}`}
              className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-gray-900">{cls.label}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {sections === null
                    ? "—"
                    : classSections.length === 0
                      ? "No sections yet"
                      : `${classSections.length} section${classSections.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

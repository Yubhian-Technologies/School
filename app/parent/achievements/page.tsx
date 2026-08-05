"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { subscribeToAchievementsForStudent } from "@/lib/achievements";
import { subscribeToLinkedStudent } from "@/lib/students";
import type { Achievement, Student } from "@/lib/types";

export default function ParentAchievementsPage() {
  const { profile } = useAuth();

  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLinkedStudent(profile.uid, setStudent);
  }, [profile?.uid]);

  useEffect(() => {
    if (!student) return;
    return subscribeToAchievementsForStudent(student.schoolId, student.id, setAchievements);
  }, [student]);

  return (
    <div className="space-y-8">
      <PageHeader title="Achievements" subtitle="Your child's recognitions, as recorded by their Class Teacher" />

      {student === undefined || (student && achievements === null) ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Loading…
        </p>
      ) : student === null ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No student is linked to this account yet.
        </p>
      ) : achievements !== null && achievements.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No achievements recorded yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {achievements?.map((a) => (
            <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                {a.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photoUrl} alt={a.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-400">
                    <Award className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{a.date}</p>
                  {a.description && <p className="mt-2 text-sm text-gray-600">{a.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

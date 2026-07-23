"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeInfo,
  Bus,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { subscribeToLinkedStudent } from "@/lib/students";
import type { GuardianInfo, ParentInfo, Student } from "@/lib/types";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}

function GuardianCard({ label, info }: { label: string; info?: ParentInfo | GuardianInfo }) {
  if (!info || !info.name) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{info.name}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Field label="Phone Number" value={info.mobile} />
        <Field label="Occupation" value={info.occupation} />
      </dl>
    </div>
  );
}

export default function ParentProfilePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    return subscribeToLinkedStudent(user.uid, setStudent);
  }, [user]);

  if (student === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (student === null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Profile" subtitle="Your child's complete profile" />
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No student is linked to this account yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {student.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.photoUrl}
            alt={student.name}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-xl font-semibold text-indigo-600">
            {student.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{student.name}</h1>
          <p className="text-sm text-gray-500">
            {student.admissionNo} · Roll No {student.rollNo}
          </p>
          {student.digitalId && (
            <a
              href={student.digitalId}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-indigo-600 hover:text-indigo-500"
            >
              View Digital ID
            </a>
          )}
        </div>
      </div>

      <Section title="Personal Details" icon={BadgeInfo}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field label="Date of Birth" value={student.dob} />
          <Field label="Gender" value={student.gender} />
          <Field label="Aadhaar Number" value={student.aadhaarNo} />
          <Field label="Blood Group" value={student.bloodGroup} />
          <Field label="Caste / Category" value={student.category} />
          <Field label="House Name" value={student.house} />
          <Field label="PIN Code" value={student.address?.pinCode} />
          <div className="col-span-2 sm:col-span-3">
            <Field label="Address" value={student.address?.current} />
          </div>
        </dl>
      </Section>

      <Section title="Academic Details" icon={GraduationCap}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field label="Class" value={student.className} />
          <Field label="Section" value={student.sectionName} />
          <Field label="Roll Number" value={student.rollNo} />
          <Field label="Admission Date" value={student.admissionDate} />
          <Field label="Previous School" value={student.previousSchool} />
        </dl>
      </Section>

      <Section title="Medical History" icon={HeartPulse}>
        <p className="text-sm text-gray-800">{student.medical?.history || "—"}</p>
      </Section>

      <Section title="Parent / Guardian Details" icon={Users}>
        <div className="space-y-3">
          <GuardianCard label="Father" info={student.father} />
          <GuardianCard label="Mother" info={student.mother} />
          <GuardianCard label="Guardian" info={student.guardian} />
        </div>
      </Section>

      <Section title="Attendance" icon={CalendarCheck}>
        <p className="text-sm text-gray-500">Not available yet.</p>
      </Section>

      <Section title="Transport" icon={Bus}>
        <p className="text-sm text-gray-500">Not available yet.</p>
      </Section>
    </div>
  );
}

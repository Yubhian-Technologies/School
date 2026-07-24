"use client";

import { useEffect, useState } from "react";
import {
  Award,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers,
  Library,
  Megaphone,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DashboardCard, { DashboardSection } from "@/components/DashboardCard";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { subscribeToStudentsForClass } from "@/lib/students";
import { DEMO_CLASS_ID } from "@/lib/navigation";
import type { ClassSection, Student } from "@/lib/types";

export default function FacultyDashboardPage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[] | null>(null);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToStudentsForClass(schoolId, mySection.id, setStudents);
  }, [schoolId, mySection]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${profile?.name || "Faculty"}`}
        subtitle="Faculty Portal"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Layers}
          label="My Class (Class Teacher)"
          value={mySection === undefined ? "—" : mySection ? `${mySection.className} ${mySection.sectionName}` : "Not assigned"}
          color="indigo"
          href={mySection ? `/faculty/class/${DEMO_CLASS_ID}/students` : undefined}
        />
        <StatCard
          icon={GraduationCap}
          label="Students in My Class"
          value={!mySection ? "—" : students === null ? "—" : students.length}
          color="purple"
        />
      </div>

      <DashboardSection label="Class Teacher">
        <DashboardCard
          icon={GraduationCap}
          title="Students"
          subtitle="Add, edit & search students"
          href={`/faculty/class/${DEMO_CLASS_ID}/students`}
          color="indigo"
        />
        <DashboardCard
          icon={CalendarCheck}
          title="Attendance"
          subtitle="Mark daily attendance"
          href={`/faculty/class/${DEMO_CLASS_ID}/attendance`}
          color="green"
        />
        <DashboardCard
          icon={FileText}
          title="Assignments"
          subtitle="Classwork & homework"
          href={`/faculty/class/${DEMO_CLASS_ID}/assignments`}
          color="orange"
        />
        <DashboardCard
          icon={Award}
          title="Achievements"
          subtitle="Record student achievements"
          href={`/faculty/class/${DEMO_CLASS_ID}/achievements`}
          color="amber"
        />
      </DashboardSection>

      <DashboardSection label="Subject Teacher">
        <DashboardCard
          icon={Library}
          title="Students"
          subtitle="View students (read-only)"
          href={`/faculty/subject/${DEMO_CLASS_ID}/students`}
          color="purple"
        />
        <DashboardCard
          icon={FileText}
          title="Assignments"
          subtitle="Classwork & homework"
          href="/faculty/subject/assignments"
          color="orange"
        />
        <DashboardCard
          icon={ClipboardCheck}
          title="Assessments"
          subtitle="Marks & grades"
          href={`/faculty/subject/${DEMO_CLASS_ID}/assessments`}
          color="pink"
        />
      </DashboardSection>

      <DashboardSection label="General">
        <DashboardCard
          icon={Megaphone}
          title="Circulars"
          subtitle="View school circulars"
          href="/faculty/circulars"
          color="pink"
        />
        <DashboardCard
          icon={CalendarDays}
          title="Events"
          subtitle="School events calendar"
          href="/faculty/events"
          color="indigo"
        />
        <DashboardCard
          icon={UserIcon}
          title="Profile"
          subtitle="Your profile & password"
          href="/faculty/profile"
          color="green"
        />
      </DashboardSection>
    </div>
  );
}

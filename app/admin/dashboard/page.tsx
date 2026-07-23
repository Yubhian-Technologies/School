"use client";

import { useEffect, useState } from "react";
import {
  Bus,
  CalendarClock,
  CalendarDays,
  Layers,
  Megaphone,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DashboardCard, { DashboardSection } from "@/components/DashboardCard";
import { subscribeToFaculty } from "@/lib/faculty";
import { subscribeToAllClassSections } from "@/lib/classSections";
import { subscribeToSchool } from "@/lib/schools";
import type { ClassSection, Faculty } from "@/lib/types";

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [faculty, setFaculty] = useState<Faculty[] | null>(null);
  const [sections, setSections] = useState<ClassSection[] | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToFaculty(schoolId, setFaculty);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToAllClassSections(schoolId, setSections);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToSchool(schoolId, (school) => setSchoolName(school?.name ?? null));
  }, [schoolId]);

  const sectionsWithTeacher = sections?.filter((s) => s.classTeacherUid) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${profile?.name || "Admin"}`}
        subtitle={schoolName ? `${schoolName} — School Administration` : "School Administration"}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Faculty"
          value={faculty === null ? "—" : faculty.length}
          color="indigo"
          href="/admin/faculty"
        />
        <StatCard
          icon={Layers}
          label="Sections"
          value={sections === null ? "—" : sections.length}
          color="purple"
          href="/admin/classes"
        />
        <StatCard
          icon={Layers}
          label="Sections with a Class Teacher"
          value={sections === null ? "—" : sectionsWithTeacher.length}
          color="green"
          href="/admin/classes"
        />
      </div>

      <DashboardSection label="Academics">
        <DashboardCard
          icon={Layers}
          title="Classes"
          subtitle="Sections & class teacher assignment"
          href="/admin/classes"
          color="purple"
        />
        <DashboardCard
          icon={Users}
          title="Faculty"
          subtitle="Add, edit, and manage faculty"
          href="/admin/faculty"
          color="indigo"
        />
        <DashboardCard
          icon={CalendarClock}
          title="Timetable"
          subtitle="Periods & class schedules"
          href="/admin/timetable"
          color="green"
        />
      </DashboardSection>

      <DashboardSection label="Operations">
        <DashboardCard
          icon={Bus}
          title="Transport"
          subtitle="Buses & routes"
          href="/admin/transport"
          color="orange"
        />
        <DashboardCard
          icon={Wallet}
          title="Fees"
          subtitle="Fee structure & student dues"
          href="/admin/fees"
          color="amber"
        />
      </DashboardSection>

      <DashboardSection label="Communications">
        <DashboardCard
          icon={Megaphone}
          title="Circulars"
          subtitle="Publish notices to faculty & parents"
          href="/admin/circulars"
          color="pink"
        />
        <DashboardCard
          icon={CalendarDays}
          title="Events"
          subtitle="School events calendar"
          href="/admin/events"
          color="indigo"
        />
      </DashboardSection>
    </div>
  );
}

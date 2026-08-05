import { notFound } from "next/navigation";
import AttendanceSectionMonthView from "@/components/attendance/AttendanceSectionMonthView";
import { CLASS_LIST } from "@/lib/classes";

export default async function AdminAttendanceSectionPage({
  params,
}: {
  params: Promise<{ classId: string; sectionId: string }>;
}) {
  const { classId, sectionId } = await params;
  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return <AttendanceSectionMonthView classId={classId} sectionId={sectionId} />;
}

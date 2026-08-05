import { notFound } from "next/navigation";
import AttendanceClassSections from "@/components/attendance/AttendanceClassSections";
import { CLASS_LIST } from "@/lib/classes";

export default async function AdminAttendanceClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return <AttendanceClassSections classId={classId} />;
}

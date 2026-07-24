import AttendanceDateDetail from "@/components/attendance/AttendanceDateDetail";

export default async function ClassAttendanceDatePage({
  params,
}: {
  params: Promise<{ classId: string; date: string }>;
}) {
  const { date } = await params;
  return <AttendanceDateDetail date={date} />;
}

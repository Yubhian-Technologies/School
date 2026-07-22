import EmptyState from "@/components/EmptyState";

export default async function ClassAssignmentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Assignments — ${classId}`} />;
}

import EmptyState from "@/components/EmptyState";

export default async function SubjectAssignmentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Subject Assignments — ${classId}`} />;
}

import EmptyState from "@/components/EmptyState";

export default async function SubjectStudentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Subject Students — ${classId}`} />;
}

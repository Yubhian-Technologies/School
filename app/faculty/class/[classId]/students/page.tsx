import EmptyState from "@/components/EmptyState";

export default async function ClassStudentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Students — ${classId}`} />;
}

import EmptyState from "@/components/EmptyState";

export default async function ClassLeavesPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Leaves — ${classId}`} />;
}

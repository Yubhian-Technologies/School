import EmptyState from "@/components/EmptyState";

export default async function ClassParentRequestsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Parent Requests — ${classId}`} />;
}

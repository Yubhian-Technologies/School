import EmptyState from "@/components/EmptyState";

export default async function ClassMessagesPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Messages — ${classId}`} />;
}

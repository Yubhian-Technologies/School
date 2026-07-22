import EmptyState from "@/components/EmptyState";

export default async function ClassAchievementsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Achievements — ${classId}`} />;
}

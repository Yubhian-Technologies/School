import EmptyState from "@/components/EmptyState";

export default async function ClassAnnouncementsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Class Announcements — ${classId}`} />;
}

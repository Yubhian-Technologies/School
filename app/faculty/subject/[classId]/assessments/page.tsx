import EmptyState from "@/components/EmptyState";

export default async function SubjectAssessmentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <EmptyState title={`Subject Assessments — ${classId}`} />;
}

import { notFound } from "next/navigation";
import TimetableGridEditor from "@/components/TimetableGridEditor";
import { CLASS_LIST } from "@/lib/classes";

export default async function TimetableGridPage({
  params,
}: {
  params: Promise<{ classId: string; sectionId: string }>;
}) {
  const { classId, sectionId } = await params;
  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return <TimetableGridEditor classId={classId} sectionId={sectionId} />;
}

import { notFound } from "next/navigation";
import ClassSectionsView from "@/components/ClassSectionsView";
import { CLASS_LIST } from "@/lib/classes";

export default async function ClassTimetablePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return <ClassSectionsView classId={classId} />;
}

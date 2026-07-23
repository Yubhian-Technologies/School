import { notFound } from "next/navigation";
import ClassSectionsManager from "@/components/ClassSectionsManager";
import { CLASS_LIST } from "@/lib/classes";

export default async function AdminClassSectionsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return <ClassSectionsManager classId={classId} />;
}

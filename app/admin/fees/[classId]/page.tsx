import { notFound } from "next/navigation";
import ClassFeeStructureManager from "@/components/fees/ClassFeeStructureManager";
import { CLASS_LIST } from "@/lib/classes";

export default async function AdminClassFeeStructurePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  if (!CLASS_LIST.some((c) => c.id === classId)) {
    notFound();
  }

  return <ClassFeeStructureManager classId={classId} />;
}

export interface ClassOption {
  id: string;
  label: string;
}

export const CLASS_LIST: ClassOption[] = [
  { id: "nursery", label: "Nursery" },
  { id: "lkg", label: "LKG" },
  { id: "ukg", label: "UKG" },
  { id: "class-1", label: "Class 1" },
  { id: "class-2", label: "Class 2" },
  { id: "class-3", label: "Class 3" },
  { id: "class-4", label: "Class 4" },
  { id: "class-5", label: "Class 5" },
  { id: "class-6", label: "Class 6" },
  { id: "class-7", label: "Class 7" },
  { id: "class-8", label: "Class 8" },
  { id: "class-9", label: "Class 9" },
  { id: "class-10", label: "Class 10" },
];

export function getClassLabel(classId: string) {
  return CLASS_LIST.find((c) => c.id === classId)?.label ?? classId;
}

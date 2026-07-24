import { doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getClassLabel } from "./classes";
import type { FeeStructure } from "./types";

// Screenshot-sourced defaults (₹) — fixed per class, not admin-editable.
export const DEFAULT_TUITION_FEE_BY_CLASS_ID: Record<string, number> = {
  nursery: 20000,
  lkg: 32500,
  ukg: 33500,
  "class-1": 34500,
  "class-2": 35500,
  "class-3": 37500,
  "class-4": 39500,
  "class-5": 41500,
  "class-6": 43500,
  "class-7": 45500,
  "class-8": 47500,
  "class-9": 49500,
  "class-10": 51500,
};

export function tuitionFeeForClass(classId: string): number {
  return DEFAULT_TUITION_FEE_BY_CLASS_ID[classId] ?? 0;
}

function feeStructureDocId(schoolId: string, classId: string, academicYear: string) {
  return `${schoolId}_${classId}_${academicYear}`;
}

export function subscribeToFeeStructure(
  schoolId: string,
  classId: string,
  academicYear: string,
  callback: (structure: FeeStructure | null) => void
) {
  return onSnapshot(
    doc(db, "feeStructures", feeStructureDocId(schoolId, classId, academicYear)),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data() as Omit<FeeStructure, "id" | "updatedAt"> & {
        updatedAt: Timestamp | null;
      };
      callback({
        id: snap.id,
        ...data,
        updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
      });
    },
    () => callback(null)
  );
}

export interface SaveFeeStructureInput {
  schoolId: string;
  classId: string;
  academicYear: string;
  books: number;
  uniform: number;
  updatedByUid: string;
}

export async function saveFeeStructure(input: SaveFeeStructureInput) {
  const tuition = tuitionFeeForClass(input.classId);
  const total = tuition + input.books + input.uniform;

  await setDoc(doc(db, "feeStructures", feeStructureDocId(input.schoolId, input.classId, input.academicYear)), {
    schoolId: input.schoolId,
    classId: input.classId,
    className: getClassLabel(input.classId),
    academicYear: input.academicYear,
    tuition,
    books: input.books,
    uniform: input.uniform,
    total,
    updatedByUid: input.updatedByUid,
    updatedAt: serverTimestamp(),
  });
}

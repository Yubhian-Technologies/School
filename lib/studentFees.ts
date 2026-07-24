import { doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { StudentFee } from "./types";

export function subscribeToStudentFee(
  studentId: string,
  callback: (fee: StudentFee | null) => void
) {
  return onSnapshot(
    doc(db, "studentFees", studentId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data() as Omit<StudentFee, "id" | "updatedAt"> & {
        updatedAt: Timestamp | null;
      };
      callback({
        id: snap.id,
        ...data,
        updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
      });
    },
    // Denied for anyone but the school's admin or the student's own guardian
    // — same "treat as nothing to show" handling as the timetable module.
    () => callback(null)
  );
}

export interface SaveStudentFeeDiscountInput {
  schoolId: string;
  studentId: string;
  classSectionId: string;
  academicYear: string;
  tuitionFee: number;
  booksFee: number;
  uniformFee: number;
  tuitionDiscountPct: number;
  booksDiscountPct: number;
  updatedByUid: string;
}

export async function saveStudentFeeDiscount(input: SaveStudentFeeDiscountInput) {
  const tuitionDiscountAmount = Math.round((input.tuitionFee * input.tuitionDiscountPct) / 100);
  const booksDiscountAmount = Math.round((input.booksFee * input.booksDiscountPct) / 100);
  const totalAmount = input.tuitionFee + input.booksFee + input.uniformFee;
  const concessionAmount = tuitionDiscountAmount + booksDiscountAmount;
  const payable = totalAmount - concessionAmount;

  await setDoc(doc(db, "studentFees", input.studentId), {
    schoolId: input.schoolId,
    studentId: input.studentId,
    classSectionId: input.classSectionId,
    academicYear: input.academicYear,
    tuitionFee: input.tuitionFee,
    booksFee: input.booksFee,
    uniformFee: input.uniformFee,
    tuitionDiscountPct: input.tuitionDiscountPct,
    booksDiscountPct: input.booksDiscountPct,
    tuitionDiscountAmount,
    booksDiscountAmount,
    totalAmount,
    concessionAmount,
    payable,
    paid: 0,
    due: payable,
    status: "DUE",
    updatedByUid: input.updatedByUid,
    updatedAt: serverTimestamp(),
  });
}

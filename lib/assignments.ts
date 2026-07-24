import { deleteDoc, doc, collection, onSnapshot, query, serverTimestamp, setDoc, where, type Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Assignment } from "./types";

function entryId(classSectionId: string, subjectId: string, date: string) {
  return `${classSectionId}_${subjectId}_${date}`;
}

export async function uploadAssignmentAttachment(schoolId: string, file: File) {
  const id = crypto.randomUUID();
  const fileRef = ref(storage, `schools/${schoolId}/assignments/${id}/${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export interface UpsertAssignmentEntryInput {
  schoolId: string;
  classSectionId: string;
  className: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  facultyUid: string;
  date: string;
  classwork: string;
  homework: string;
  dueDate?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

// One entry per (class-section, subject, day) — saving the same day again
// simply overwrites it, matching "she updates the classwork/homework
// everyday" (editable throughout that day, not appended to).
export async function upsertAssignmentEntry(input: UpsertAssignmentEntryInput) {
  const id = entryId(input.classSectionId, input.subjectId, input.date);
  await setDoc(doc(db, "assignments", id), {
    schoolId: input.schoolId,
    classSectionId: input.classSectionId,
    className: input.className,
    sectionName: input.sectionName,
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    facultyUid: input.facultyUid,
    date: input.date,
    classwork: input.classwork.trim(),
    homework: input.homework.trim(),
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    ...(input.attachmentUrl ? { attachmentUrl: input.attachmentUrl, attachmentName: input.attachmentName } : {}),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function deleteAssignmentEntry(id: string) {
  await deleteDoc(doc(db, "assignments", id));
}

function mapDoc(docSnap: { id: string; data: () => unknown }): Assignment {
  const data = docSnap.data() as Omit<Assignment, "id" | "updatedAt"> & {
    updatedAt: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
  };
}

export function subscribeToAssignmentsForTeacherSubject(
  schoolId: string,
  classSectionId: string,
  subjectId: string,
  callback: (entries: Assignment[]) => void
) {
  const q = query(
    collection(db, "assignments"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId),
    where("subjectId", "==", subjectId)
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(mapDoc).sort((a, b) => b.date.localeCompare(a.date));
    callback(entries);
  });
}

export function subscribeToAssignmentsForSection(
  schoolId: string,
  classSectionId: string,
  callback: (entries: Assignment[]) => void
) {
  const q = query(
    collection(db, "assignments"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId)
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs
      .map(mapDoc)
      .sort((a, b) => b.date.localeCompare(a.date) || a.subjectName.localeCompare(b.subjectName));
    callback(entries);
  });
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Subject, SubjectType } from "./types";

export interface SubjectInput {
  name: string;
  code?: string;
  type: SubjectType;
  hoursPerWeek?: number | null;
}

async function assertNameAvailable(
  schoolId: string,
  className: string,
  name: string,
  excludeSubjectId?: string
) {
  const snap = await getDocs(
    query(
      collection(db, "subjects"),
      where("schoolId", "==", schoolId),
      where("className", "==", className)
    )
  );
  const trimmed = name.trim().toLowerCase();
  const taken = snap.docs.some(
    (d) => d.id !== excludeSubjectId && (d.data().name as string).trim().toLowerCase() === trimmed
  );
  if (taken) {
    throw new Error(`Subject "${name}" already exists for this class.`);
  }
}

export async function createSubject(schoolId: string, className: string, input: SubjectInput) {
  await assertNameAvailable(schoolId, className, input.name);

  const ref = await addDoc(collection(db, "subjects"), {
    schoolId,
    className,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    type: input.type,
    hoursPerWeek: input.hoursPerWeek || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSubject(
  schoolId: string,
  className: string,
  subjectId: string,
  input: SubjectInput
) {
  await assertNameAvailable(schoolId, className, input.name, subjectId);

  await updateDoc(doc(db, "subjects", subjectId), {
    name: input.name.trim(),
    code: input.code?.trim() || null,
    type: input.type,
    hoursPerWeek: input.hoursPerWeek || null,
  });
}

export async function deleteSubject(subjectId: string) {
  await deleteDoc(doc(db, "subjects", subjectId));
}

export function subscribeToSubjects(
  schoolId: string,
  className: string,
  callback: (subjects: Subject[]) => void
) {
  const q = query(
    collection(db, "subjects"),
    where("schoolId", "==", schoolId),
    where("className", "==", className)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const subjects = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as Omit<Subject, "id" | "createdAt"> & {
            createdAt: Timestamp | null;
          };
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toMillis() : null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      callback(subjects);
    },
    (err) => {
      // TEMP diagnostic — pin down which query is actually being denied.
      // Remove once the subjects permission-denied report is resolved.
      console.error("[subscribeToSubjects] permission-denied debug", { schoolId, className, err });
    }
  );
}

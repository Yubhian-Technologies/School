import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { TimetableSection } from "./types";

export interface CreateSectionInput {
  schoolId: string;
  classId: string;
  name: string;
}

export async function createSection(input: CreateSectionInput) {
  const ref = await addDoc(collection(db, "timetableSections"), {
    schoolId: input.schoolId,
    classId: input.classId,
    name: input.name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteSection(sectionId: string) {
  await deleteDoc(doc(db, "timetableSections", sectionId));
  // A grid doc may never have been created (e.g. the section's timetable was
  // never opened) — a security-rule check against a nonexistent doc's
  // resource.data errors out, so this cleanup is best-effort.
  await deleteDoc(doc(db, "timetableGrids", sectionId)).catch(() => {});
}

export function subscribeToSections(
  schoolId: string,
  classId: string,
  callback: (sections: TimetableSection[]) => void
) {
  const q = query(
    collection(db, "timetableSections"),
    where("schoolId", "==", schoolId),
    where("classId", "==", classId)
  );
  return onSnapshot(q, (snapshot) => {
    const sections = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as {
          schoolId: string;
          classId: string;
          name: string;
          createdAt: Timestamp | null;
        };
        return {
          id: docSnap.id,
          schoolId: data.schoolId,
          classId: data.classId,
          name: data.name,
          createdAt: data.createdAt ? data.createdAt.toMillis() : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    callback(sections);
  });
}

export async function getSection(sectionId: string): Promise<TimetableSection | null> {
  const snap = await getDoc(doc(db, "timetableSections", sectionId));
  if (!snap.exists()) return null;
  const data = snap.data() as {
    schoolId: string;
    classId: string;
    name: string;
    createdAt: Timestamp | null;
  };
  return {
    id: snap.id,
    schoolId: data.schoolId,
    classId: data.classId,
    name: data.name,
    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
  };
}

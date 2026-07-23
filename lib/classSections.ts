import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ClassSection } from "./types";

export function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  // Indian school year runs April–March; before April, we're still in the
  // year that started the previous April.
  const startYear = now.getMonth() >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export interface CreateClassSectionInput {
  schoolId: string;
  className: string;
  sectionName: string;
}

export async function createClassSection(input: CreateClassSectionInput) {
  const sectionName = input.sectionName.trim();

  const existing = await getDocs(
    query(
      collection(db, "classSections"),
      where("schoolId", "==", input.schoolId),
      where("className", "==", input.className)
    )
  );
  const isDuplicate = existing.docs.some(
    (docSnap) =>
      (docSnap.data().sectionName as string).trim().toLowerCase() ===
      sectionName.toLowerCase()
  );
  if (isDuplicate) {
    throw new Error(`Section "${sectionName}" already exists in ${input.className}.`);
  }

  const ref = await addDoc(collection(db, "classSections"), {
    schoolId: input.schoolId,
    academicYear: getCurrentAcademicYear(),
    className: input.className,
    sectionName,
    classTeacherUid: null,
  });
  return ref.id;
}

export function subscribeToClassSections(
  schoolId: string,
  className: string,
  callback: (sections: ClassSection[]) => void
) {
  const q = query(
    collection(db, "classSections"),
    where("schoolId", "==", schoolId),
    where("className", "==", className)
  );
  return onSnapshot(q, (snapshot) => {
    const sections = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as Omit<ClassSection, "id">;
        return { id: docSnap.id, ...data };
      })
      .sort((a, b) => a.sectionName.localeCompare(b.sectionName));
    callback(sections);
  });
}

export async function updateClassTeacher(
  schoolId: string,
  sectionId: string,
  classTeacherUid: string | null
) {
  if (classTeacherUid) {
    const existing = await getDocs(
      query(
        collection(db, "classSections"),
        where("schoolId", "==", schoolId),
        where("classTeacherUid", "==", classTeacherUid)
      )
    );
    const assignedElsewhere = existing.docs.some((docSnap) => docSnap.id !== sectionId);
    if (assignedElsewhere) {
      throw new Error("This faculty is already the class teacher of another section.");
    }
  }

  await updateDoc(doc(db, "classSections", sectionId), { classTeacherUid });
}

export async function deleteClassSection(sectionId: string) {
  await deleteDoc(doc(db, "classSections", sectionId));
}

export function subscribeToAllClassSections(
  schoolId: string,
  callback: (sections: ClassSection[]) => void
) {
  const q = query(collection(db, "classSections"), where("schoolId", "==", schoolId));
  return onSnapshot(q, (snapshot) => {
    const sections = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Omit<ClassSection, "id">;
      return { id: docSnap.id, ...data };
    });
    callback(sections);
  });
}

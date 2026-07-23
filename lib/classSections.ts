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

async function assertTeacherAvailable(
  schoolId: string,
  classTeacherUid: string,
  excludeSectionId?: string
) {
  const existing = await getDocs(
    query(
      collection(db, "classSections"),
      where("schoolId", "==", schoolId),
      where("classTeacherUid", "==", classTeacherUid)
    )
  );
  const assignedElsewhere = existing.docs.some((docSnap) => docSnap.id !== excludeSectionId);
  if (assignedElsewhere) {
    throw new Error("This faculty is already the class teacher of another section.");
  }
}

export interface CreateClassSectionInput {
  schoolId: string;
  className: string;
  sectionName: string;
  academicYear?: string;
  studentIntake?: number | null;
  classTeacherUid?: string | null;
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

  if (input.classTeacherUid) {
    await assertTeacherAvailable(input.schoolId, input.classTeacherUid);
  }

  const ref = await addDoc(collection(db, "classSections"), {
    schoolId: input.schoolId,
    academicYear: input.academicYear?.trim() || getCurrentAcademicYear(),
    className: input.className,
    sectionName,
    classTeacherUid: input.classTeacherUid || null,
    ...(input.studentIntake ? { studentIntake: input.studentIntake } : {}),
  });
  return ref.id;
}

export interface UpdateClassSectionInput {
  sectionName: string;
  academicYear: string;
  studentIntake?: number | null;
  classTeacherUid?: string | null;
}

export async function updateClassSection(
  schoolId: string,
  sectionId: string,
  input: UpdateClassSectionInput
) {
  if (input.classTeacherUid) {
    await assertTeacherAvailable(schoolId, input.classTeacherUid, sectionId);
  }

  await updateDoc(doc(db, "classSections", sectionId), {
    sectionName: input.sectionName.trim(),
    academicYear: input.academicYear.trim() || getCurrentAcademicYear(),
    studentIntake: input.studentIntake || null,
    classTeacherUid: input.classTeacherUid || null,
  });
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
    await assertTeacherAvailable(schoolId, classTeacherUid, sectionId);
  }

  await updateDoc(doc(db, "classSections", sectionId), { classTeacherUid });
}

export async function deleteClassSection(sectionId: string) {
  await deleteDoc(doc(db, "classSections", sectionId));
}

/** A faculty member can be class teacher of at most one section at a time
 * (enforced in updateClassTeacher above) — resolves that section, if any,
 * so the Class Teacher's own pages never need a manual class/section picker. */
export function subscribeToClassSectionForTeacher(
  schoolId: string,
  teacherUid: string,
  callback: (section: ClassSection | null) => void
) {
  const q = query(
    collection(db, "classSections"),
    where("schoolId", "==", schoolId),
    where("classTeacherUid", "==", teacherUid)
  );
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const docSnap = snapshot.docs[0];
    callback({ id: docSnap.id, ...(docSnap.data() as Omit<ClassSection, "id">) });
  });
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

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { getCurrentAcademicYear } from "./classSections";
import type { Achievement } from "./types";

export { getCurrentAcademicYear };

// Three terms across the school's April-March academic year (see
// getCurrentAcademicYear in lib/classSections.ts) — Apr-Jul, Aug-Nov,
// Dec-Mar. Stamped onto each achievement at creation time so "Achievements
// This Term" reflects the term it was actually added in, not whatever term
// it happens to be whenever someone views the page later.
export function getCurrentTerm(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-11
  if (month >= 3 && month <= 6) return "Term 1";
  if (month >= 7 && month <= 10) return "Term 2";
  return "Term 3";
}

export async function uploadAchievementPhoto(schoolId: string, file: File) {
  const id = crypto.randomUUID();
  const fileRef = ref(storage, `schools/${schoolId}/achievements/${id}/${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export interface CreateAchievementInput {
  schoolId: string;
  studentId: string;
  classSectionId: string;
  title: string;
  description: string;
  photo: File | null;
  createdByUid: string;
}

export async function createAchievement(input: CreateAchievementInput) {
  const photoUrl = input.photo ? await uploadAchievementPhoto(input.schoolId, input.photo) : null;
  const now = new Date();
  await addDoc(collection(db, "achievements"), {
    schoolId: input.schoolId,
    studentId: input.studentId,
    classSectionId: input.classSectionId,
    title: input.title.trim(),
    description: input.description.trim(),
    date: now.toISOString().slice(0, 10),
    academicYear: getCurrentAcademicYear(),
    term: getCurrentTerm(now),
    isDeleted: false,
    deletedAt: null,
    ...(photoUrl ? { photoUrl } : {}),
    createdByUid: input.createdByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export interface UpdateAchievementInput {
  title: string;
  description: string;
  photo?: File | null;
}

export async function updateAchievement(schoolId: string, id: string, input: UpdateAchievementInput) {
  const updates: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    updatedAt: serverTimestamp(),
  };
  if (input.photo) {
    updates.photoUrl = await uploadAchievementPhoto(schoolId, input.photo);
  }
  await updateDoc(doc(db, "achievements", id), updates);
}

// Soft delete only — the record stays in Firestore with isDeleted: true so
// historical stats (Total Achievements / Achievements This Term) never
// decrease. Every active view (the table, Section Highlights, the Parent
// dashboard's query) filters isDeleted == false, so it disappears from
// everything a class teacher or parent actually sees.
export async function deleteAchievement(id: string) {
  await updateDoc(doc(db, "achievements", id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function toMillis(value: Timestamp | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : value.toMillis();
}

function mapAchievementDoc(docSnap: QueryDocumentSnapshot): Achievement {
  const data = docSnap.data() as Omit<Achievement, "id" | "createdAt" | "updatedAt" | "deletedAt"> & {
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
    deletedAt: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    isDeleted: data.isDeleted ?? false,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    deletedAt: toMillis(data.deletedAt),
  };
}

// Returns EVERY achievement for the section, active or soft-deleted — the
// Class Teacher page needs the full set to compute the historical Total
// Achievements / Achievements This Term cards, and derives the active-only
// view (table + Section Highlights) by filtering isDeleted == false itself.
// Scoped by classSectionId (equality-filtered) to match achievements/{id}'s
// list rule branch isAnyTeacherOf(resource.data.classSectionId) — same
// provability requirement as every other class-scoped query in this app
// (see lib/students.ts's assertAdmissionNoAvailable comment).
export function subscribeToAchievementsForSection(
  schoolId: string,
  classSectionId: string,
  callback: (entries: Achievement[]) => void
) {
  const q = query(
    collection(db, "achievements"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId)
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(mapAchievementDoc).sort((a, b) => b.date.localeCompare(a.date));
    callback(entries);
  });
}

// Parent-facing: filters isDeleted == false server-side (not just in the UI)
// so a soft-deleted achievement is never fetched for a parent to begin with.
// Scoped by studentId (equality-filtered) to match achievements/{id}'s list
// rule branch isGuardianOf(resource.data.studentId) — this is what keeps a
// parent's read strictly to their own child's achievements, never a
// classmate's, regardless of class/section.
export function subscribeToAchievementsForStudent(
  schoolId: string,
  studentId: string,
  callback: (entries: Achievement[]) => void
) {
  const q = query(
    collection(db, "achievements"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId),
    where("isDeleted", "==", false)
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(mapAchievementDoc).sort((a, b) => b.date.localeCompare(a.date));
    callback(entries);
  });
}

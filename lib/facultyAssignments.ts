import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FacultyAssignment } from "./types";

function assignmentId(classSectionId: string, subjectId: string) {
  return `${classSectionId}_${subjectId}`;
}

export interface AssignSubjectTeacherInput {
  schoolId: string;
  classSectionId: string;
  className: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  facultyUid: string;
  facultyName: string;
}

// One subject has exactly one subject teacher per section at a time — this
// setDoc always fully overwrites whatever was assigned before.
export async function assignSubjectTeacher(input: AssignSubjectTeacherInput) {
  await setDoc(doc(db, "facultyAssignments", assignmentId(input.classSectionId, input.subjectId)), {
    schoolId: input.schoolId,
    classSectionId: input.classSectionId,
    className: input.className,
    sectionName: input.sectionName,
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    facultyUid: input.facultyUid,
    facultyName: input.facultyName,
    role: "SUBJECT_TEACHER",
    createdAt: serverTimestamp(),
  });
}

export async function unassignSubjectTeacher(classSectionId: string, subjectId: string) {
  await deleteDoc(doc(db, "facultyAssignments", assignmentId(classSectionId, subjectId)));
}

function mapDoc(docSnap: { id: string; data: () => unknown }): FacultyAssignment {
  const data = docSnap.data() as Omit<FacultyAssignment, "id" | "createdAt"> & {
    createdAt: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
  };
}

export function subscribeToTeacherAssignmentsForSection(
  schoolId: string,
  classSectionId: string,
  callback: (assignments: FacultyAssignment[]) => void
) {
  const q = query(
    collection(db, "facultyAssignments"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(mapDoc));
  });
}

export function subscribeToFacultyAssignment(
  assignmentId: string,
  callback: (assignment: FacultyAssignment | null) => void
) {
  return onSnapshot(
    doc(db, "facultyAssignments", assignmentId),
    (snap) => callback(snap.exists() ? mapDoc(snap) : null),
    () => callback(null)
  );
}

export function subscribeToTeacherAssignmentsForFaculty(
  schoolId: string,
  facultyUid: string,
  callback: (assignments: FacultyAssignment[]) => void
) {
  const q = query(
    collection(db, "facultyAssignments"),
    where("schoolId", "==", schoolId),
    where("facultyUid", "==", facultyUid)
  );
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs
      .map(mapDoc)
      .sort((a, b) =>
        `${a.classSectionId}${a.subjectName}`.localeCompare(`${b.classSectionId}${b.subjectName}`)
      );
    callback(assignments);
  });
}

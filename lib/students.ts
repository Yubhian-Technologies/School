import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { createAuthUserAndRun, deleteAuthAccount } from "./secondaryAuth";
import type { Student } from "./types";

export interface ParentDetails {
  name: string;
  mobile: string;
  occupation: string;
}

export const emptyParentDetails = (): ParentDetails => ({ name: "", mobile: "", occupation: "" });

export interface StudentFields {
  admissionNo: string;
  name: string;
  rollNo: string;
  admissionDate: string;
  dob: string;
  gender: string;
  aadhaarNo: string;
  bloodGroup: string;
  category: string;
  house: string;
  previousSchool: string;
  addressLine: string;
  pinCode: string;
  medicalHistory: string;
  father: ParentDetails;
  mother: ParentDetails;
  guardian: ParentDetails;
}

export interface CreateStudentInput extends StudentFields {
  schoolId: string;
  classSectionId: string;
  className: string;
  sectionName: string;
  createdByUid: string;
  photo: File | null;
  digitalIdFile: File | null;
  /** A single login (labeled "Student Login" but used by whichever parent signs in). */
  loginEmail: string;
  loginPassword: string;
}

export interface UpdateStudentInput extends StudentFields {
  className: string;
  sectionName: string;
  photo?: File | null;
  digitalIdFile?: File | null;
}

export interface CreateStudentResult {
  studentId: string;
  parentUid: string;
}

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return out;
}

// Scoped by classSectionId (not just schoolId) on purpose: Firestore denies
// an entire query up front unless it can prove every possible matching doc
// satisfies the security rule — students/{id}'s list rule for a faculty
// caller is isAnyTeacherOf(resource.data.classSectionId), which Firestore
// can only verify when classSectionId is pinned by an equality filter in
// the query itself. A schoolId-only query (no classSectionId filter) always
// gets rejected outright for a faculty caller, regardless of what's
// actually in the collection — this was silently breaking every Add/Edit
// Student save. Trade-off: admission numbers are only guaranteed unique
// within a class-section, not school-wide.
async function assertAdmissionNoAvailable(
  schoolId: string,
  classSectionId: string,
  admissionNo: string,
  excludeStudentId?: string
) {
  const snap = await getDocs(
    query(
      collection(db, "students"),
      where("schoolId", "==", schoolId),
      where("classSectionId", "==", classSectionId),
      where("admissionNo", "==", admissionNo.trim())
    )
  );
  const taken = snap.docs.some((d) => d.id !== excludeStudentId);
  if (taken) {
    throw new Error(`Student ID "${admissionNo}" is already in use.`);
  }
}

export async function uploadStudentPhoto(schoolId: string, file: File) {
  const id = crypto.randomUUID();
  const photoRef = ref(storage, `schools/${schoolId}/students/${id}/${file.name}`);
  await uploadBytes(photoRef, file);
  return getDownloadURL(photoRef);
}

export async function uploadStudentDigitalId(schoolId: string, file: File) {
  const id = crypto.randomUUID();
  // Nested under students/ (not a separate top-level prefix) so it's covered
  // by the same storage.rules match block as the student photo.
  const fileRef = ref(storage, `schools/${schoolId}/students/${id}/digital-id/${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/** Returns a trimmed {name, mobile, occupation} for Firestore, or null if the
 * whole block was left blank (e.g. "Guardian" is optional — "if any"). */
function cleanParent(p: ParentDetails) {
  const name = p.name.trim();
  const mobile = p.mobile.trim();
  const occupation = p.occupation.trim();
  if (!name && !mobile && !occupation) return null;
  return { name, mobile, occupation };
}

function coreFieldsDoc(input: StudentFields) {
  return {
    admissionNo: input.admissionNo.trim(),
    name: input.name,
    rollNo: input.rollNo,
    admissionDate: input.admissionDate,
    dob: input.dob,
    gender: input.gender,
    aadhaarNo: input.aadhaarNo,
    bloodGroup: input.bloodGroup,
    category: input.category,
    house: input.house,
    previousSchool: input.previousSchool,
    address: { current: input.addressLine, pinCode: input.pinCode },
    medical: { history: input.medicalHistory },
  };
}

export async function createStudent(input: CreateStudentInput): Promise<CreateStudentResult> {
  await assertAdmissionNoAvailable(input.schoolId, input.classSectionId, input.admissionNo);
  const photoUrl = input.photo ? await uploadStudentPhoto(input.schoolId, input.photo) : null;
  const digitalId = input.digitalIdFile
    ? await uploadStudentDigitalId(input.schoolId, input.digitalIdFile)
    : null;

  return createAuthUserAndRun(input.loginEmail, input.loginPassword, async (parentUid) => {
    const father = cleanParent(input.father);
    const mother = cleanParent(input.mother);
    const guardian = cleanParent(input.guardian);
    const contactName = father?.name || mother?.name || guardian?.name || "Parent";
    const contactPhone = father?.mobile || mother?.mobile || guardian?.mobile || "";

    await setDoc(doc(db, "users", parentUid), {
      uid: parentUid,
      email: input.loginEmail,
      role: "parent",
      schoolId: input.schoolId,
      status: "active",
      name: contactName,
      phone: contactPhone,
    });

    const studentRef = await addDoc(collection(db, "students"), {
      schoolId: input.schoolId,
      classSectionId: input.classSectionId,
      className: input.className,
      sectionName: input.sectionName,
      academicYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
      photoUrl,
      digitalId,
      ...coreFieldsDoc(input),
      ...(father ? { father } : {}),
      ...(mother ? { mother } : {}),
      ...(guardian ? { guardian } : {}),
      guardianUids: [parentUid],
      status: "active",
      createdByUid: input.createdByUid,
      createdAt: serverTimestamp(),
    });

    // Lets this parent read class-scoped (not student-scoped) collections
    // like the Assignments diary — see isParentLinkedToClass in
    // firestore.rules. Existence-only marker doc, no fields ever updated.
    await setDoc(doc(db, "parentClassLinks", `${parentUid}_${input.classSectionId}`), {
      parentUid,
      classSectionId: input.classSectionId,
      schoolId: input.schoolId,
    });

    return { studentId: studentRef.id, parentUid };
  });
}

export async function updateStudent(
  schoolId: string,
  classSectionId: string,
  studentId: string,
  input: UpdateStudentInput
) {
  await assertAdmissionNoAvailable(schoolId, classSectionId, input.admissionNo, studentId);

  const updates: Record<string, unknown> = {
    ...coreFieldsDoc(input),
    className: input.className,
    sectionName: input.sectionName,
    father: cleanParent(input.father) ?? deleteField(),
    mother: cleanParent(input.mother) ?? deleteField(),
    guardian: cleanParent(input.guardian) ?? deleteField(),
  };

  if (input.photo) {
    updates.photoUrl = await uploadStudentPhoto(schoolId, input.photo);
  }
  if (input.digitalIdFile) {
    updates.digitalId = await uploadStudentDigitalId(schoolId, input.digitalIdFile);
  }

  await updateDoc(doc(db, "students", studentId), updates);
}

export async function deleteStudent(
  student: Pick<Student, "id" | "guardianUids" | "classSectionId">
) {
  await deleteDoc(doc(db, "students", student.id));
  for (const guardianUid of student.guardianUids) {
    await deleteDoc(doc(db, "parentClassLinks", `${guardianUid}_${student.classSectionId}`)).catch(() => {});
    await deleteAuthAccount(guardianUid);
  }
}

// Students created before parentClassLinks existed (or by any future path
// that forgets to write it) are missing the marker doc that lets their
// parent read class-scoped collections like the Assignments diary — this
// silently self-heals them the next time their Class Teacher opens the
// Student Directory. Always overwrites rather than checking existence
// first: the fields are static, so re-writing an already-correct doc is a
// harmless no-op, and a getDoc-then-setDoc here would try to *read* a doc
// that (for exactly the students this is trying to fix) doesn't exist yet —
// parentClassLinks' read rule isn't guarded for a null `resource`, so that
// read would itself throw permission-denied.
export async function backfillParentClassLinks(students: Pick<Student, "schoolId" | "classSectionId" | "guardianUids">[]) {
  for (const s of students) {
    for (const guardianUid of s.guardianUids) {
      const linkRef = doc(db, "parentClassLinks", `${guardianUid}_${s.classSectionId}`);
      await setDoc(linkRef, { parentUid: guardianUid, classSectionId: s.classSectionId, schoolId: s.schoolId });
    }
  }
}

function mapStudentDoc(docSnap: QueryDocumentSnapshot): Student {
  const data = docSnap.data() as Omit<Student, "id" | "createdAt"> & {
    createdAt: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
  };
}

export function subscribeToStudentsForClass(
  schoolId: string,
  classSectionId: string,
  callback: (students: Student[]) => void
) {
  const q = query(
    collection(db, "students"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId)
  );
  return onSnapshot(q, (snapshot) => {
    const students = snapshot.docs
      .map(mapStudentDoc)
      .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));
    callback(students);
  });
}

export function subscribeToLinkedStudent(
  parentUid: string,
  callback: (student: Student | null) => void
) {
  const q = query(collection(db, "students"), where("guardianUids", "array-contains", parentUid));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.empty ? null : mapStudentDoc(snapshot.docs[0]));
  });
}

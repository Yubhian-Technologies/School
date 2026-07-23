import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { createAuthUserAndRun, deleteAuthAccount } from "./secondaryAuth";
import type { Faculty } from "./types";

export interface CreateFacultyInput {
  schoolId: string;
  name: string;
  gender: "Male" | "Female";
  dob: string;
  mobile: string;
  email: string;
  qualification: string;
  subjects: string;
  designation: string;
  doj: string;
  experience: string;
  hasPriorExperience: "Yes" | "No";
  previousSchool: string;
  address: string;
  emergencyContact: string;
  password: string;
  status: "Active" | "Inactive";
  photo: File | null;
}

export type UpdateFacultyInput = Partial<
  Omit<CreateFacultyInput, "schoolId" | "email" | "password" | "photo">
> & { photo?: File | null };

async function nextFacultyId(schoolId: string) {
  const snap = await getDocs(
    query(collection(db, "faculty"), where("schoolId", "==", schoolId))
  );
  return `FAC${String(snap.size + 1).padStart(4, "0")}`;
}

export async function uploadFacultyPhoto(schoolId: string, uid: string, file: File) {
  const photoRef = ref(storage, `schools/${schoolId}/faculty/${uid}/${file.name}`);
  await uploadBytes(photoRef, file);
  return getDownloadURL(photoRef);
}

export async function createFaculty(input: CreateFacultyInput) {
  try {
    return await createAuthUserAndRunFaculty(input);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/email-already-in-use") throw err;

    // The Auth account for this email already exists — check whether it's a
    // real duplicate (a users/ profile exists) or an orphaned account left
    // over from an earlier failed attempt (Auth user created, but the
    // Firestore writes never completed and rollback couldn't clean it up).
    try {
      const existingProfile = await getDocs(
        query(
          collection(db, "users"),
          where("schoolId", "==", input.schoolId),
          where("email", "==", input.email)
        )
      );
      if (existingProfile.empty) {
        throw Object.assign(
          new Error(
            `"${input.email}" has a leftover Firebase Authentication account from an earlier ` +
              "failed attempt (no matching profile exists for it). Remove it in Firebase Console " +
              "> Authentication, or use a different email."
          ),
          { code: "faculty/orphaned-auth-account" }
        );
      }
    } catch (diagnosticErr) {
      if ((diagnosticErr as { code?: string }).code === "faculty/orphaned-auth-account") {
        throw diagnosticErr;
      }
      // The diagnostic lookup itself failed — fall through to the original error.
    }
    throw err;
  }
}

async function createAuthUserAndRunFaculty(input: CreateFacultyInput) {
  return createAuthUserAndRun(input.email, input.password, async (uid) => {
    const facultyId = await nextFacultyId(input.schoolId);
    const photoURL = input.photo
      ? await uploadFacultyPhoto(input.schoolId, uid, input.photo)
      : null;

    await setDoc(doc(db, "users", uid), {
      uid,
      email: input.email,
      role: "faculty",
      schoolId: input.schoolId,
      status: input.status.toLowerCase(),
      name: input.name,
      phone: input.mobile,
    });

    await setDoc(doc(db, "faculty", uid), {
      uid,
      facultyId,
      schoolId: input.schoolId,
      name: input.name,
      gender: input.gender,
      dob: input.dob,
      mobile: input.mobile,
      email: input.email,
      qualification: input.qualification,
      subjects: input.subjects,
      designation: input.designation,
      doj: input.doj,
      experience: input.experience,
      hasPriorExperience: input.hasPriorExperience,
      previousSchool: input.hasPriorExperience === "Yes" ? input.previousSchool : "",
      address: input.address,
      emergencyContact: input.emergencyContact,
      photoURL,
      status: input.status,
      createdAt: serverTimestamp(),
    });

    return uid;
  });
}

export function subscribeToFaculty(
  schoolId: string,
  callback: (faculty: Faculty[]) => void
) {
  const q = query(collection(db, "faculty"), where("schoolId", "==", schoolId));
  return onSnapshot(q, (snapshot) => {
    const faculty = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as Omit<Faculty, "createdAt"> & {
          createdAt: Timestamp | null;
        };
        return {
          ...data,
          createdAt: data.createdAt ? data.createdAt.toMillis() : null,
        };
      })
      .sort((a, b) => a.facultyId.localeCompare(b.facultyId));
    callback(faculty);
  });
}

export async function updateFaculty(uid: string, schoolId: string, input: UpdateFacultyInput) {
  const { photo, ...fields } = input;
  const updates: Record<string, unknown> = { ...fields };

  if (input.hasPriorExperience) {
    updates.previousSchool = input.hasPriorExperience === "Yes" ? (input.previousSchool ?? "") : "";
  }

  if (photo) {
    updates.photoURL = await uploadFacultyPhoto(schoolId, uid, photo);
  }

  await updateDoc(doc(db, "faculty", uid), updates);

  const userUpdates: Record<string, unknown> = {};
  if (input.name) userUpdates.name = input.name;
  if (input.mobile) userUpdates.phone = input.mobile;
  if (input.status) userUpdates.status = input.status.toLowerCase();
  if (Object.keys(userUpdates).length > 0) {
    await updateDoc(doc(db, "users", uid), userUpdates);
  }
}

export async function deleteFaculty(uid: string) {
  await deleteDoc(doc(db, "faculty", uid));
  await deleteDoc(doc(db, "users", uid));
  await deleteAuthAccount(uid);
}

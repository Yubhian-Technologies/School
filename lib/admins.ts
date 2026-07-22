import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { createAuthUserAndRun } from "./secondaryAuth";
import type { UserProfile } from "./types";

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  schoolId: string;
}

export async function createAdmin(input: CreateAdminInput) {
  return createAuthUserAndRun(input.email, input.password, async (uid) => {
    await setDoc(doc(db, "users", uid), {
      uid,
      email: input.email,
      role: "admin",
      schoolId: input.schoolId,
      status: "active",
      name: input.name,
      phone: input.phone,
    });

    return uid;
  });
}

export function subscribeToAdmins(callback: (admins: UserProfile[]) => void) {
  const q = query(collection(db, "users"), where("role", "==", "admin"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => docSnap.data() as UserProfile));
  });
}

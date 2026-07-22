import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { School } from "./types";

export interface CreateSchoolInput {
  name: string;
  place: string;
  adminName: string;
}

export async function createSchool(input: CreateSchoolInput) {
  await addDoc(collection(db, "schools"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToSchools(callback: (schools: School[]) => void) {
  const q = query(collection(db, "schools"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const schools = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as {
        name: string;
        place: string;
        adminName: string;
        createdAt: Timestamp | null;
      };
      return {
        id: docSnap.id,
        name: data.name,
        place: data.place,
        adminName: data.adminName,
        createdAt: data.createdAt ? data.createdAt.toMillis() : null,
      };
    });
    callback(schools);
  });
}

export function subscribeToSchool(
  schoolId: string,
  callback: (school: School | null) => void
) {
  return onSnapshot(doc(db, "schools", schoolId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as {
      name: string;
      place: string;
      adminName: string;
      createdAt: Timestamp | null;
    };
    callback({
      id: snap.id,
      name: data.name,
      place: data.place,
      adminName: data.adminName,
      createdAt: data.createdAt ? data.createdAt.toMillis() : null,
    });
  });
}

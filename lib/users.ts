import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface UpdateUserProfileInput {
  name: string;
  phone: string;
}

export async function updateUserProfile(uid: string, input: UpdateUserProfileInput) {
  await updateDoc(doc(db, "users", uid), { ...input });
}

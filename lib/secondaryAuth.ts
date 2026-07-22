import { initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";
import { firebaseConfig } from "./firebase";

/**
 * Creates a Firebase Auth user on a throwaway secondary app instance (so the
 * caller's own signed-in session isn't replaced — createUserWithEmailAndPassword
 * normally signs in as whichever user it just created), then runs `run` with
 * the new uid. If `run` throws (e.g. a Firestore write is denied by security
 * rules), the just-created Auth user is deleted so the email doesn't end up
 * orphaned — Auth account present, no matching Firestore doc, and every retry
 * failing with auth/email-already-in-use.
 */
export async function createAuthUserAndRun<T>(
  email: string,
  password: string,
  run: (uid: string) => Promise<T>
): Promise<T> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    try {
      const result = await run(credential.user.uid);
      await signOut(secondaryAuth);
      return result;
    } catch (err) {
      await deleteUser(credential.user).catch(() => {});
      throw err;
    }
  } finally {
    await deleteApp(secondaryApp);
  }
}

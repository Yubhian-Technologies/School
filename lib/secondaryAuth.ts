import { initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfig } from "./firebase";

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

/**
 * Deletes another user's Firebase Auth account (email + password) via the
 * /api/delete-account server route — the client SDK can only delete
 * auth.currentUser, not an arbitrary uid. Call this after deleting the
 * corresponding Firestore doc, so a since-deleted faculty/parent's email
 * can be reused instead of failing with auth/email-already-in-use forever.
 */
export async function deleteAuthAccount(uid: string) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("Not signed in.");
  }

  const res = await fetch("/api/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ uid }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || "Could not delete the account.");
  }
}

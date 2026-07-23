import { initializeApp, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { auth, firebaseConfig } from "./firebase";

/**
 * Creates a Firebase Auth user on a throwaway secondary app instance (so the
 * caller's own signed-in session isn't replaced — createUserWithEmailAndPassword
 * normally signs in as whichever user it just created), then runs `run` with
 * the new uid. If `run` throws (e.g. a Firestore write is denied by security
 * rules), the just-created Auth user is deleted so the email doesn't end up
 * orphaned — Auth account present, no matching Firestore doc, and every retry
 * failing with auth/email-already-in-use.
 *
 * The rollback deletion goes through deleteAuthAccount (the Admin-SDK-backed
 * /api/delete-account route), not the client SDK's deleteUser() on
 * credential.user — that one requires a "recent login" that a just-created
 * secondary-app session doesn't reliably satisfy, which was failing with
 * auth/requires-recent-login and leaving the account orphaned every time.
 * The caller here is the signed-in admin/faculty performing the create, so
 * deleteAuthAccount authenticates as them (an authorized deleter), not as the
 * new (and about-to-be-rolled-back) user.
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
      await deleteAuthAccount(credential.user.uid).catch((cleanupErr) => {
        // Rollback failed — this Auth account is now orphaned (exists with no
        // matching Firestore doc) and will make every future attempt with this
        // email fail with auth/email-already-in-use. Logged loudly since the
        // client has no way to self-heal this any further — needs manual
        // cleanup in the Firebase Console (or a working
        // FIREBASE_SERVICE_ACCOUNT_KEY so this path succeeds next time).
        console.error(
          `Failed to roll back orphaned Auth account for ${email} after a setup error. ` +
            "Remove it manually in Firebase Console > Authentication.",
          cleanupErr
        );
      });
      throw err;
    }
  } finally {
    // Never let cleanup itself mask a successful result or the real error above.
    await deleteApp(secondaryApp).catch(() => {});
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

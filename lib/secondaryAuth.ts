import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "./firebase";

/**
 * Creates a Firebase Auth user on a throwaway secondary app instance.
 * createUserWithEmailAndPassword signs the new user into whatever auth
 * instance it runs on, so a second app is used here to avoid replacing the
 * signed-in super admin's session in the primary app.
 */
export async function createAuthUserWithoutSignIn(
  email: string,
  password: string
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

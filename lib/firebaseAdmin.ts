import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK access, for operations the client SDK can't
 * do (e.g. deleting another user's Auth account — the client SDK can only
 * delete auth.currentUser). Requires FIREBASE_SERVICE_ACCOUNT_KEY in
 * .env.local: the full JSON contents of a service account key (Firebase
 * Console → Project settings → Service accounts → Generate new private key),
 * minified to one line. Never expose this key or this module to the client.
 */
function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Generate a service account key in " +
        "Firebase Console → Project settings → Service accounts, and set its JSON " +
        "contents as this env var in .env.local."
    );
  }
  return JSON.parse(raw);
}

function getAdminApp() {
  return getApps()[0] ?? initializeApp({ credential: cert(loadCredential()) });
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

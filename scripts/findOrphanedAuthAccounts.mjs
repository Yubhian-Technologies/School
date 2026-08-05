// Read-only diagnostic: lists every Firebase Auth account that has no
// matching users/{uid} Firestore doc. These are leftovers from
// deleteFaculty/deleteStudent's Auth-cleanup step failing (e.g. before
// FIREBASE_SERVICE_ACCOUNT_KEY was configured) — the Firestore record is
// gone but the email/password login still exists, blocking that email from
// being reused. Does not delete anything; review the list and remove
// confirmed leftovers manually in Firebase Console > Authentication.
//
// Usage: node --env-file=.env.local scripts/findOrphanedAuthAccounts.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) {
  console.error(
    "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Run this with:\n" +
      "  node --env-file=.env.local scripts/findOrphanedAuthAccounts.mjs"
  );
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(raw)) });
const auth = getAuth();
const db = getFirestore();

const orphaned = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const user of page.users) {
    const profile = await db.collection("users").doc(user.uid).get();
    if (!profile.exists) {
      orphaned.push(user);
    }
  }
  pageToken = page.pageToken;
} while (pageToken);

if (orphaned.length === 0) {
  console.log("No orphaned Auth accounts found — every Auth user has a matching users/{uid} doc.");
} else {
  console.log(`Found ${orphaned.length} orphaned Auth account(s) (no matching Firestore users/{uid} doc):\n`);
  for (const u of orphaned) {
    console.log(`  ${u.email ?? "(no email)"}  uid=${u.uid}  created=${u.metadata.creationTime}`);
  }
  console.log(
    "\nThese are safe to delete if you don't recognize them as in-progress work — " +
      "remove them in Firebase Console > Authentication (search by email) so those " +
      "emails can be reused. This script does not delete anything itself."
  );
}

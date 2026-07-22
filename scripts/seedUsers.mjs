// One-time setup script: creates the 4 sample Firebase Auth users + matching
// Firestore `users/{uid}` docs so /login can be tested for every role.
// Requires serviceAccountKey.json in the project root (see README.md).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, "..", "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
} catch {
  console.error(
    `Missing or unreadable serviceAccountKey.json at ${serviceAccountPath}.\n` +
      "Generate one from Firebase console → Project settings → Service accounts, and save it there."
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const PASSWORD = "Passw0rd!";
const SCHOOL_ID = "demo-school";

const SAMPLE_USERS = [
  { email: "superadmin@demo-erp.test", role: "superadmin", schoolId: null },
  { email: "admin@demo-erp.test", role: "admin", schoolId: SCHOOL_ID },
  { email: "faculty@demo-erp.test", role: "faculty", schoolId: SCHOOL_ID },
  { email: "parent@demo-erp.test", role: "parent", schoolId: SCHOOL_ID },
];

for (const { email, role, schoolId } of SAMPLE_USERS) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    userRecord = await auth.createUser({ email, password: PASSWORD, emailVerified: true });
  }

  await db.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    role,
    schoolId,
    status: "active",
  });

  console.log(`✔ ${role.padEnd(10)} ${email} (uid: ${userRecord.uid})`);
}

console.log(`\nAll sample users share the password: ${PASSWORD}`);

// Ad hoc helper: create (or update the Firestore profile for) a single user
// via the Firebase client SDK, using only the NEXT_PUBLIC_* config already in
// .env.local — no service account key required.
//
// Usage:
//   node --env-file=.env.local scripts/createUser.mjs <email> <password> <role> [schoolId]
//   role   = superadmin | admin | faculty | parent
//   schoolId = omit or "null" for superadmin
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const [email, password, role, schoolIdArg] = process.argv.slice(2);

if (!email || !password || !role) {
  console.error(
    "Usage: node --env-file=.env.local scripts/createUser.mjs <email> <password> <role> [schoolId]"
  );
  process.exit(1);
}

const schoolId = !schoolIdArg || schoolIdArg === "null" ? null : schoolIdArg;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let credential;
try {
  credential = await createUserWithEmailAndPassword(auth, email, password);
} catch (err) {
  if (err.code === "auth/email-already-in-use") {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } else {
    throw err;
  }
}

await setDoc(doc(db, "users", credential.user.uid), {
  uid: credential.user.uid,
  email,
  role,
  schoolId,
  status: "active",
});

console.log(`✔ ${role} ${email} (uid: ${credential.user.uid})`);
process.exit(0);

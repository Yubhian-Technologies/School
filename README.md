School ERP — login, role-based routing, and empty dashboard shells for four roles (Super Admin, Admin, Faculty, Parent), built with Next.js (App Router), Firebase Auth, Firestore, TypeScript, and Tailwind.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root path redirects to `/login`.

Firebase client config is read from `.env.local` (`NEXT_PUBLIC_FIREBASE_*` vars) via `lib/firebase.ts`.

## Firestore security rules

Firestore starts locked down (all reads/writes denied), which blocks login and the super admin's school/admin management. In **Firebase Console → Firestore Database → Rules**, publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function callerRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    match /users/{uid} {
      allow read: if isSignedIn() && (request.auth.uid == uid || callerRole() == 'superadmin');
      allow write: if isSignedIn() && (request.auth.uid == uid || callerRole() == 'superadmin');
    }

    match /schools/{schoolId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && callerRole() == 'superadmin';
    }
  }
}
```

- A signed-in user can always read/write their own `users/{uid}` doc (needed for login's role lookup).
- A super admin can read/write any `users/{uid}` doc (needed to create admins and list them on `/superadmin/admins`).
- Any signed-in user can read `schools`; only a super admin can create/edit them.

## How auth + routing works

- `context/AuthContext.tsx` listens to Firebase Auth state and, once signed in, fetches the matching `users/{uid}` Firestore document for the role/schoolId.
- `/login` signs in with email/password, looks up the role, and redirects to `/superadmin/dashboard`, `/admin/dashboard`, `/faculty/dashboard`, or `/parent/dashboard`.
- Each role's route group (`app/superadmin`, `app/admin`, `app/faculty`, `app/parent`) is wrapped by `components/RoleGuard.tsx`, a client-side guard: unauthenticated visitors are sent to `/login`; a signed-in user with the wrong role is sent to their own dashboard.
- This is client-side route protection (no server session/middleware), which matches the scope of this shell — there's no server-rendered data yet that needs protecting.
- Every dashboard has a working **Log out** button in the top bar (`components/LogoutButton.tsx`).

## Super admin: schools & admins

- `/superadmin/schools` — create schools (`lib/schools.ts`, `schools` collection: `name`, `place`, `createdAt`) and see them listed live.
- `/superadmin/admins` — create admin logins (`lib/admins.ts`) with name, email, password, phone, and an assigned school (dropdown of existing schools). This writes both a Firebase Auth account and a `users/{uid}` Firestore doc (`role: "admin"`, `schoolId`, `name`, `phone`).
- Creating an admin uses a throwaway secondary Firebase app instance (`lib/secondaryAuth.ts`) so the super admin's own signed-in session isn't replaced by the new admin's — `createUserWithEmailAndPassword` normally signs in as whichever user it just created.
- `/superadmin/dashboard` shows live counts and the 5 most recent schools/admins.
- `/superadmin/profile` — shows the signed-in super admin's own basic details (name, email, phone).

## Seeding the 4 sample users

Login needs both a Firebase Auth account and a matching Firestore `users/{uid}` doc. `scripts/seedUsers.mjs` creates both using the Firebase Admin SDK.

1. In the Firebase console, go to **Project settings → Service accounts → Generate new private key**, and save the file as `serviceAccountKey.json` in the project root (already gitignored).
2. Make sure **Email/Password** sign-in is enabled under **Authentication → Sign-in method**.
3. Run:

   ```bash
   npm run seed:users
   ```

This creates/updates 4 accounts, all with password `Passw0rd!`:

| Role       | Email                    | schoolId      |
|------------|---------------------------|---------------|
| superadmin | superadmin@demo-erp.test | `null`        |
| admin      | admin@demo-erp.test      | `demo-school` |
| faculty    | faculty@demo-erp.test    | `demo-school` |
| parent     | parent@demo-erp.test     | `demo-school` |

Sign in at `/login` with any of these to land on the matching dashboard.

For a single one-off account (no service account key needed — uses the same public client config as the app), use `scripts/createUser.mjs`:

```bash
node --env-file=.env.local scripts/createUser.mjs <email> <password> <role> [schoolId]
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

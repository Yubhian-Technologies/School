School ERP — login, role-based routing, and empty dashboard shells for four roles (Super Admin, Admin, Faculty, Parent), built with Next.js (App Router), Firebase Auth, Firestore, TypeScript, and Tailwind.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root path redirects to `/login`.

Firebase client config is read from `.env.local` (`NEXT_PUBLIC_FIREBASE_*` vars) via `lib/firebase.ts`.

## Firestore security rules

Firestore starts locked down (all reads/writes denied), which blocks login and every other read/write in the app. The rules for every collection — users, schools, faculty, students, classSections, subjects, attendance, assignments, achievements, assessments, parentRequests, leaveRequests, conversations, announcements, circulars, events, activities, transportBuses, timetables (both Timetable designs — see `CLAUDE.md`), feeStructures, studentFees, and documents — live in [firestore.rules](firestore.rules), the single source of truth. There's no CI/CD wiring it up automatically: after any local edit, copy its full contents into **Firebase Console → Firestore Database → Rules → Publish**.

See `firestore.rules` itself for the extensibility pattern (`isSchoolScopedAdminCollection` / `isParentReviewedRequestCollection` registries) and `CLAUDE.md` for known gaps and recent fixes.

## Storage rules (faculty profile photos)

Faculty photos upload to `faculty-photos/{uid}/{fileName}` in Firebase Storage, which also starts locked down. In **Firebase Console → Storage → Rules**, publish:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /faculty-photos/{uid}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## How auth + routing works

- `context/AuthContext.tsx` listens to Firebase Auth state and, once signed in, fetches the matching `users/{uid}` Firestore document for the role/schoolId.
- `/login` signs in with email/password, looks up the role, and redirects via `ROLE_HOME` (`lib/roles.ts`) to `/superadmin/dashboard`, `/admin/dashboard`, `/faculty/dashboard`, or `/parent/profile`.
- Each role's route group (`app/superadmin`, `app/admin`, `app/faculty`, `app/parent`) is wrapped by `components/RoleGuard.tsx`, a client-side guard: unauthenticated visitors are sent to `/login`; a signed-in user with the wrong role is sent to their own dashboard.
- This is client-side route protection (no server session/middleware), which matches the scope of this shell — there's no server-rendered data yet that needs protecting.
- Every dashboard has a working **Log out** button in the sidebar's profile footer (`components/Sidebar.tsx`).

## Super admin: schools & admins

- `/superadmin/schools` — create schools (`lib/schools.ts`, `schools` collection: `name`, `place`, `createdAt`) and see them listed live.
- `/superadmin/admins` — create admin logins (`lib/admins.ts`) with name, email, password, phone, and an assigned school (dropdown of existing schools). This writes both a Firebase Auth account and a `users/{uid}` Firestore doc (`role: "admin"`, `schoolId`, `name`, `phone`).
- Creating an admin uses a throwaway secondary Firebase app instance (`lib/secondaryAuth.ts`) so the super admin's own signed-in session isn't replaced by the new admin's — `createUserWithEmailAndPassword` normally signs in as whichever user it just created.
- `/superadmin/dashboard` shows live counts and the 5 most recent schools/admins.
- `/superadmin/profile` — shows the signed-in super admin's own basic details (name, email, phone).

## Admin: faculty

- `/admin/faculty` — add, edit, delete, and search faculty (`lib/faculty.ts`, `faculty` collection, one doc per faculty `uid`) for the signed-in admin's own school.
- **Add Faculty** opens a form covering all faculty fields (profile photo, name, gender, DOB, mobile, email, password, qualification, subjects, designation, date of joining, experience, emergency contact, address, status). Faculty ID is auto-generated (`FAC0001`, `FAC0002`, ...) on save. Saving creates a Firebase Auth account (email/password) plus a `users/{uid}` doc (`role: "faculty"`) and a `faculty/{uid}` doc, using the same secondary-app pattern as admin creation.
- **Edit** opens the same form pre-filled; email and password aren't editable from here (email is tied to the Auth account, password changes aren't exposed to admins via the client SDK).
- **Delete** removes the `faculty/{uid}` and `users/{uid}` docs, which blocks that faculty member from logging in (their Firebase Auth account itself isn't deletable from the client SDK for a different user).
- **Search Faculty** looks up by Faculty ID or Mobile Number and opens the full profile.
- Profile photos upload to Firebase Storage at `faculty-photos/{uid}/{fileName}` — see the Storage rules above.

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

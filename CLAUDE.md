# School ERP — Project Guide

## What this is

A multi-school ERP for Nursery–Class 10 schools, with four roles: **Super Admin**, **Admin**, **Faculty**, **Parent**. Next.js (App Router) + TypeScript + Tailwind + Firebase (Auth, Firestore, planned Storage).

The full functional spec lives in [docs/context.md](docs/context.md) — treat it as the source of truth for *what* every module should do. This file describes *where the project currently stands* against that spec and *what to build next*.

## Current state (built and working)

- **Auth + role routing**: [context/AuthContext.tsx](context/AuthContext.tsx) listens to Firebase Auth, loads the `users/{uid}` Firestore doc for role/schoolId. [app/login/page.tsx](app/login/page.tsx) signs in and redirects via `ROLE_HOME` ([lib/roles.ts](lib/roles.ts)). [components/RoleGuard.tsx](components/RoleGuard.tsx) client-side-guards each role's route group (`app/superadmin`, `app/admin`, `app/faculty`, `app/parent`).
- **Super Admin module — fully implemented**: create schools ([lib/schools.ts](lib/schools.ts), `app/superadmin/schools`), create admin logins ([lib/admins.ts](lib/admins.ts), `app/superadmin/admins`, using a secondary Firebase app in [lib/secondaryAuth.ts](lib/secondaryAuth.ts) so creating a user doesn't replace the super admin's session), a dashboard with live counts, and a profile page.
- **Data model — fully designed, not yet wired to UI**: [lib/types.ts](lib/types.ts) defines every collection's shape (Faculty, ClassSection, Student, Attendance, Assignment, Achievement, Assessment, ParentRequest, LeaveRequest, Conversation/Message, Announcement, Circular, SchoolEvent, Activity, TransportBus, Timetable, FeeStructure/StudentFee, StudentDocument).
- **Firestore security rules — fully designed** ([firestore.rules](firestore.rules)): every collection above already has read/write rules keyed off `myRole()`, `mySchool()`, `isClassTeacherOf()`/`isAnyTeacherOf()` (via a denormalized `classSectionRoles` map on the faculty doc), and `isGuardianOf()` (via `guardianUids` on the student doc). Two extensible "bucket" registries (`isSchoolScopedAdminCollection`, `isParentReviewedRequestCollection`) let a new collection get correct rules just by being added to a list — **prefer that over writing a new `match` block** when a collection fits either shape.
- **Everything else is an empty placeholder**: every Admin, Faculty, and Parent page (`app/admin/*`, `app/faculty/*`, `app/parent/*`) is currently a 5-line stub rendering `<EmptyState title="..." />` ([components/EmptyState.tsx](components/EmptyState.tsx)). No CRUD logic, no Firestore reads/writes, no forms exist yet for any of these modules. `lib/navigation.ts` already has a `DEMO_CLASS_ID` placeholder used in faculty nav links until real class/section data exists.

In short: **auth, routing, the super-admin module, the full data schema, and the full security-rule schema are done. Every Admin/Faculty/Parent feature module described in docs/context.md still needs its UI and `lib/*.ts` data-access functions written.**

## Flow to be executed (build order)

Build bottom-up so later modules have the data they depend on. Each module = one `lib/<name>.ts` (Firestore CRUD, following the pattern in [lib/schools.ts](lib/schools.ts): typed input, `addDoc`/`onSnapshot`, `serverTimestamp()`) + the corresponding page(s) replacing their `EmptyState` stub.

1. **Admin · Classes & Sections + Faculty** — `app/admin/faculty`. Add/Search/Update/Delete faculty ([context/context.md](docs/context.md) Tab 1). This is the prerequisite for everything else: faculty assignments (`classSectionRoles`) drive the entire Faculty dashboard's Class Teacher vs Subject Teacher split, and `classSections` records are needed before students can be assigned to one.
2. **Admin · Student Directory** — not its own admin tab in context.md, but `students` must exist before Attendance/Assignments/Achievements/Assessments/Fees/Documents can be exercised. It's specified in detail under the **Class Teacher Dashboard → Student Directory** section of context.md — build it there, exposed to the Class Teacher role.
3. **Faculty Dashboard** — welcome section, summary cards, "My Assigned Classes" (reads `facultyAssignments`/`classSectionRoles`), recent activity, notifications.
4. **Class Teacher modules** (`app/faculty/class/[classId]/*`, all stubs today): Student Directory (Add/View/Search/Edit/Transfer/Digital ID), Attendance, Assignments, Achievements, Parent Requests, Leave Management, Parent Communication, Announcements.
5. **Subject Teacher modules** (`app/faculty/subject/[classId]/*`): Students (view-only), Assignments, Assessments.
6. **Admin · Transport, Timetable (Excel upload), Fee Particulars, Circulars, Events** — the remaining Tabs 2–6 in context.md. Timetable upload needs an `.xlsx`/`.xls` parser + validation (duplicate period numbers, start < end time, required columns) and Firebase Storage for the file.
7. **Parent Dashboard** (`app/parent/*`, all stubs today) — mostly read-only projections of data produced by Admin/Faculty: Profile, Academics (timetable + results), Assignments, Assessments (explicitly deferred/empty per context.md), Activities, Achievements, Attendance, Fee Particulars, Leaves (parent can create), Circulars, Document Upload (parent can create). **Transport GPS Tracking** and **Route Map** are explicitly specified as empty placeholders for future work — leave them as `EmptyState`.
8. **Faculty common modules**: Circulars (view-only), Events (view-only), My Profile (change password, update photo).

## Conventions to follow

- New Firestore collection: add its shape to [lib/types.ts](lib/types.ts), add its rule via the appropriate registry in [firestore.rules](firestore.rules) (or a new `match` block only if neither bucket fits), then add a `lib/<name>.ts` with the CRUD functions.
- Keep using `schoolId` scoping on every school-owned document, and `classSectionId` scoping wherever context.md describes class-level access — the rules already assume both are present on `request.resource.data`.
- Parent → student linkage is solely `guardianUids` on the student doc; parent → class-level (non-student-scoped) reads go through the `parentClassLinks` marker doc, not a query on students.
- Follow the existing page shell pattern (`components/Sidebar.tsx`, `components/TopNav.tsx`/`Topbar.tsx`, `components/Modal.tsx`) already used by the Super Admin pages when building out Admin/Faculty/Parent pages, for visual/UX consistency.

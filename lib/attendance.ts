import {
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AttendanceRecord, AttendanceSession, AttendanceSummary } from "./types";

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function summaryId(classSectionId: string, date: string, session: AttendanceSession) {
  return `${classSectionId}_${date}_${session}`;
}

function recordId(studentId: string, date: string, session: AttendanceSession) {
  return `${studentId}_${date}_${session}`;
}

function toMillis(ts: Timestamp | null | undefined): number | null {
  return ts ? ts.toMillis() : null;
}

function mapSummaryDoc(docSnap: QueryDocumentSnapshot): AttendanceSummary {
  const data = docSnap.data() as Omit<AttendanceSummary, "id" | "submittedAt" | "updatedAt"> & {
    submittedAt: Timestamp | null;
    updatedAt?: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    submittedAt: toMillis(data.submittedAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function mapRecordDoc(docSnap: QueryDocumentSnapshot): AttendanceRecord {
  const data = docSnap.data() as Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt"> & {
    createdAt: Timestamp | null;
    updatedAt?: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

/** Direct doc-id read (not a query), so the Firestore "every rule-dependent
 * field must be pinned by an equality where()" gotcha doesn't apply here —
 * resource.data is fully known for a single-document read. Used by the
 * Dashboard/Take Attendance ("has this session been submitted today?") and
 * the past-date detail page. undefined = loading, null = nothing submitted
 * for that class/date/session yet. */
export function subscribeToAttendanceSummary(
  classSectionId: string,
  date: string,
  session: AttendanceSession,
  callback: (summary: AttendanceSummary | null | undefined) => void
) {
  return onSnapshot(doc(db, "attendanceSummaries", summaryId(classSectionId, date, session)), (snap) => {
    callback(snap.exists() ? mapSummaryDoc(snap as QueryDocumentSnapshot) : null);
  });
}

/** History list source. Pins BOTH schoolId and classSectionId — classSectionId
 * alone matches `isAnyTeacherOf(resource.data.classSectionId)` (Faculty), but
 * this is now also read by Admin (Admin Attendance's per-section month
 * view), whose only viable branch is `isAdminOfSchool(resource.data.schoolId)`
 * — that's unprovable for a `list` unless schoolId itself is pinned by an
 * equality filter too (same gotcha already hit once on
 * subscribeToAttendanceRecordsForDate — re-pin whenever a query gains a new
 * caller role). Needs the (schoolId, classSectionId, date) composite index
 * in firestore.indexes.json. Returns both Morning and Afternoon summaries
 * intermixed (up to 2 per date) — callers group them by date client-side. */
export function subscribeToAttendanceHistory(
  schoolId: string,
  classSectionId: string,
  callback: (summaries: AttendanceSummary[]) => void
) {
  const q = query(
    collection(db, "attendanceSummaries"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapSummaryDoc)));
}

/** Past-date read-only detail view. Equality-only (schoolId, classSectionId,
 * date), no orderBy, so no composite index is needed. `schoolId` is pinned
 * even though `classSectionId` alone already scopes the query correctly —
 * the `attendance` read rule's only branch that isn't unconditionally false
 * for an Admin caller is `isAdminOfSchool(resource.data.schoolId)` (the
 * `isAnyTeacherOf`/`isGuardianOf` branches both require a role Admin
 * doesn't have, so they contribute nothing), and that branch can't be
 * proven safe for a list unless schoolId itself is pinned by an equality
 * filter — omitting it here denied this query outright for Admin (used via
 * AttendanceDateDetail's Admin usage) even though it worked fine for
 * Faculty (whose `isAnyTeacherOf(resource.data.classSectionId)` branch was
 * already provable). Returns both sessions' records (up to 2 per student)
 * for that date. */
export function subscribeToAttendanceRecordsForDate(
  schoolId: string,
  classSectionId: string,
  date: string,
  callback: (records: AttendanceRecord[]) => void
) {
  const q = query(
    collection(db, "attendance"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId),
    where("date", "==", date)
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapRecordDoc)));
}

/** Parent's month view — pins studentId (matches isGuardianOf's rule branch)
 * plus a date range, ordered desc to match the existing
 * (studentId ASC, date DESC) composite index. Returns both sessions' records
 * (up to 2 per date) — callers group them by date client-side. */
export function subscribeToChildAttendanceForRange(
  studentId: string,
  startDate: string,
  endDate: string,
  callback: (records: AttendanceRecord[]) => void
) {
  const q = query(
    collection(db, "attendance"),
    where("studentId", "==", studentId),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapRecordDoc)));
}

export interface AttendanceEntryInput {
  studentId: string;
  present: boolean;
  remark?: string;
}

export interface SubmitSessionAttendanceInput {
  schoolId: string;
  classSectionId: string;
  date: string;
  session: AttendanceSession;
  teacherUid: string;
  entries: AttendanceEntryInput[];
}

/** Writes every attendance/{studentId}_{date}_{session} doc plus the single
 * attendanceSummaries/{classSectionId}_{date}_{session} doc in one
 * writeBatch, so the submission is all-or-nothing. Morning and Afternoon are
 * submitted independently (this is called once per session).
 *
 * Upserts: firestore.rules now allows the real Class Teacher of this section
 * to both `create` a fresh session and later `update` it (delete remains
 * disallowed) — see firestore.rules' attendance/attendanceSummaries blocks.
 * A plain `batch.set()` would already overwrite an existing doc at the
 * Firestore-client level, but doing that naively would also wipe the
 * original `createdAt`/`submittedAt` timestamp on every edit. To preserve
 * it: this does one plain (non-batched) read of the summary doc first to
 * decide whether this is a fresh submission or an edit, then every write
 * uses `{ merge: true }` so an edit only touches the fields it actually
 * changes (present/remark/updatedAt) and leaves the original creation
 * timestamp alone. That pre-check read is governed by the same read rule as
 * always (already permits the class teacher via isAnyTeacherOf), so no
 * rules change was needed for it.
 *
 * Simplification: whether this is a "fresh create" vs "edit" is decided
 * once, from the summary doc's existence, and applied uniformly to every
 * per-student record in the batch — not re-checked per student. In the rare
 * case a student joined the class after the original submission, their
 * individual record will get a `createdAt` stamped on this "edit" too
 * (technically their first-ever record) rather than back-dating it to the
 * original session — a reasonable simplification rather than N extra reads
 * (one per student) before every submission. */
export async function submitSessionAttendance(input: SubmitSessionAttendanceInput): Promise<void> {
  const summaryRef = doc(db, "attendanceSummaries", summaryId(input.classSectionId, input.date, input.session));
  const existingSummarySnap = await getDoc(summaryRef);
  const isEdit = existingSummarySnap.exists();

  const batch = writeBatch(db);
  let presentCount = 0;
  let absentCount = 0;

  for (const entry of input.entries) {
    batch.set(
      doc(db, "attendance", recordId(entry.studentId, input.date, input.session)),
      {
        schoolId: input.schoolId,
        classSectionId: input.classSectionId,
        studentId: entry.studentId,
        date: input.date,
        session: input.session,
        present: entry.present,
        // { merge: true } below means an empty remark must be actively
        // cleared with deleteField() on an edit — otherwise a remark set on
        // the original submission would survive being blanked out, since
        // merge only touches fields present in this payload.
        ...(entry.remark?.trim() ? { remark: entry.remark.trim() } : isEdit ? { remark: deleteField() } : {}),
        markedByUid: input.teacherUid,
        ...(isEdit ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
    if (entry.present) presentCount++;
    else absentCount++;
  }

  batch.set(
    summaryRef,
    {
      schoolId: input.schoolId,
      classSectionId: input.classSectionId,
      date: input.date,
      session: input.session,
      teacherUid: input.teacherUid,
      totalStudents: input.entries.length,
      presentCount,
      absentCount,
      ...(isEdit ? { updatedAt: serverTimestamp() } : { submittedAt: serverTimestamp() }),
    },
    { merge: true }
  );

  await batch.commit();
}

export function computeSessionAttendancePercent(
  s: Pick<AttendanceSummary, "presentCount" | "totalStudents">
): number {
  if (s.totalStudents === 0) return 0;
  return Math.round((s.presentCount / s.totalStudents) * 100);
}

/** Combines a date's Morning + Afternoon summaries (either may be missing —
 * not yet taken) into one day-level percentage, each session weighted
 * equally by its own student count. */
export function computeDayAttendancePercent(
  morning: AttendanceSummary | null | undefined,
  afternoon: AttendanceSummary | null | undefined
): number {
  const totalSessions = (morning?.totalStudents ?? 0) + (afternoon?.totalStudents ?? 0);
  if (totalSessions === 0) return 0;
  const totalPresent = (morning?.presentCount ?? 0) + (afternoon?.presentCount ?? 0);
  return Math.round((totalPresent / totalSessions) * 100);
}

export interface DayAttendance {
  date: string;
  morning?: AttendanceRecord;
  afternoon?: AttendanceRecord;
}

/** Groups a flat list of per-session records (as returned by
 * subscribeToChildAttendanceForRange / subscribeToAttendanceRecordsForDate)
 * into one entry per date. */
export function groupRecordsByDate(records: AttendanceRecord[]): Map<string, DayAttendance> {
  const map = new Map<string, DayAttendance>();
  for (const r of records) {
    const entry = map.get(r.date) ?? { date: r.date };
    if (r.session === "MORNING") entry.morning = r;
    else entry.afternoon = r;
    map.set(r.date, entry);
  }
  return map;
}

/** Pure client-side aggregation over whatever subscribeToChildAttendanceForRange
 * already delivered — no extra Firestore read. A day counts as Present only
 * if both sessions were marked present, Absent only if both were marked
 * absent, and Half Day for any other mix (including a day where only one
 * session has been taken so far). */
export function summarizeAttendanceRecords(records: AttendanceRecord[]) {
  const byDate = groupRecordsByDate(records);
  let present = 0;
  let absent = 0;
  let halfDay = 0;
  for (const { morning, afternoon } of byDate.values()) {
    if (morning?.present && afternoon?.present) present++;
    else if (morning && afternoon && !morning.present && !afternoon.present) absent++;
    else halfDay++;
  }
  const total = byDate.size;
  const percent = total === 0 ? 0 : Math.round(((present + 0.5 * halfDay) / total) * 100);
  return { present, absent, halfDay, total, percent };
}

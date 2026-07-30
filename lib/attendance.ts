import {
  collection,
  doc,
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

function mapSummaryDoc(docSnap: QueryDocumentSnapshot): AttendanceSummary {
  const data = docSnap.data() as Omit<AttendanceSummary, "id" | "submittedAt"> & {
    submittedAt: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    submittedAt: data.submittedAt ? data.submittedAt.toMillis() : null,
  };
}

function mapRecordDoc(docSnap: QueryDocumentSnapshot): AttendanceRecord {
  return { ...(docSnap.data() as Omit<AttendanceRecord, "id">), id: docSnap.id };
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

/** History list source — pins classSectionId (matches isAnyTeacherOf's rule
 * branch and the composite index added alongside this feature). Returns both
 * Morning and Afternoon summaries intermixed (up to 2 per date) — callers
 * group them by date client-side. */
export function subscribeToAttendanceHistory(
  classSectionId: string,
  callback: (summaries: AttendanceSummary[]) => void
) {
  const q = query(
    collection(db, "attendanceSummaries"),
    where("classSectionId", "==", classSectionId),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapSummaryDoc)));
}

/** Past-date read-only detail view. Equality-only (classSectionId, date), no
 * orderBy, so no composite index is needed. Returns both sessions' records
 * (up to 2 per student) for that date. */
export function subscribeToAttendanceRecordsForDate(
  classSectionId: string,
  date: string,
  callback: (records: AttendanceRecord[]) => void
) {
  const q = query(
    collection(db, "attendance"),
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
 * submitted independently (this is called once per session) — if this
 * session's doc id already exists (i.e. a resubmit), firestore.rules
 * evaluates that write as `update` and denies it (rules set update to `if
 * false`), so commit() rejects the whole batch — no partial writes, and this
 * is the actual enforcement of "only one submission per class per day per
 * session", not just a client-side check. */
export async function submitSessionAttendance(input: SubmitSessionAttendanceInput): Promise<void> {
  const batch = writeBatch(db);
  let presentCount = 0;
  let absentCount = 0;

  for (const entry of input.entries) {
    batch.set(doc(db, "attendance", recordId(entry.studentId, input.date, input.session)), {
      schoolId: input.schoolId,
      classSectionId: input.classSectionId,
      studentId: entry.studentId,
      date: input.date,
      session: input.session,
      present: entry.present,
      ...(entry.remark?.trim() ? { remark: entry.remark.trim() } : {}),
      markedByUid: input.teacherUid,
    });
    if (entry.present) presentCount++;
    else absentCount++;
  }

  batch.set(doc(db, "attendanceSummaries", summaryId(input.classSectionId, input.date, input.session)), {
    schoolId: input.schoolId,
    classSectionId: input.classSectionId,
    date: input.date,
    session: input.session,
    teacherUid: input.teacherUid,
    submittedAt: serverTimestamp(),
    totalStudents: input.entries.length,
    presentCount,
    absentCount,
  });

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

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
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  AttendanceSummary,
} from "./types";

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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
 * Dashboard ("has today been submitted?") and the past-date detail page.
 * undefined = loading, null = nothing submitted for that class/date yet. */
export function subscribeToAttendanceSummary(
  classSectionId: string,
  date: string,
  callback: (summary: AttendanceSummary | null | undefined) => void
) {
  return onSnapshot(doc(db, "attendanceSummaries", `${classSectionId}_${date}`), (snap) => {
    callback(snap.exists() ? mapSummaryDoc(snap as QueryDocumentSnapshot) : null);
  });
}

/** History list source — pins classSectionId (matches isAnyTeacherOf's rule
 * branch and the composite index added alongside this feature). */
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
 * orderBy, so no composite index is needed. */
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
 * (studentId ASC, date DESC) composite index. */
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
  status: Exclude<AttendanceStatus, "LATE" | "LEAVE">;
  session?: AttendanceSession; // required iff status === "HALF_DAY"
}

export interface SubmitAttendanceInput {
  schoolId: string;
  classSectionId: string;
  date: string;
  teacherUid: string;
  entries: AttendanceEntryInput[];
}

/** Writes every attendance/{studentId}_{date} doc plus the single
 * attendanceSummaries/{classSectionId}_{date} doc in one writeBatch, so the
 * submission is all-or-nothing. If either doc id already exists (i.e. this
 * is a resubmit for a class/date already taken), firestore.rules evaluates
 * that write as `update` and denies it (rules set update to `if false`),
 * so commit() rejects the whole batch — no partial writes, and this is the
 * actual enforcement of "only one submission per class per day", not just
 * a client-side check. */
export async function submitAttendance(input: SubmitAttendanceInput): Promise<void> {
  const batch = writeBatch(db);
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;

  for (const entry of input.entries) {
    if (entry.status === "HALF_DAY" && !entry.session) {
      throw new Error("Every Half Day student needs a Morning/Afternoon choice.");
    }
    batch.set(doc(db, "attendance", `${entry.studentId}_${input.date}`), {
      schoolId: input.schoolId,
      classSectionId: input.classSectionId,
      studentId: entry.studentId,
      date: input.date,
      status: entry.status,
      ...(entry.status === "HALF_DAY" ? { session: entry.session } : {}),
      markedByUid: input.teacherUid,
    });
    if (entry.status === "PRESENT") presentCount++;
    else if (entry.status === "ABSENT") absentCount++;
    else halfDayCount++;
  }

  batch.set(doc(db, "attendanceSummaries", `${input.classSectionId}_${input.date}`), {
    schoolId: input.schoolId,
    classSectionId: input.classSectionId,
    date: input.date,
    teacherUid: input.teacherUid,
    submittedAt: serverTimestamp(),
    totalStudents: input.entries.length,
    presentCount,
    absentCount,
    halfDayCount,
  });

  await batch.commit();
}

// Half Day counts as half a present day.
export function computeAttendancePercent(
  s: Pick<AttendanceSummary, "presentCount" | "halfDayCount" | "totalStudents">
): number {
  if (s.totalStudents === 0) return 0;
  return Math.round(((s.presentCount + 0.5 * s.halfDayCount) / s.totalStudents) * 100);
}

/** Pure client-side aggregation over whatever subscribeToChildAttendanceForRange
 * already delivered — no extra Firestore read. */
export function summarizeAttendanceRecords(records: AttendanceRecord[]) {
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const halfDay = records.filter((r) => r.status === "HALF_DAY").length;
  const total = records.length;
  const percent = total === 0 ? 0 : Math.round(((present + 0.5 * halfDay) / total) * 100);
  return { present, absent, halfDay, total, percent };
}

import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { AttendanceHoliday, AttendanceSession, HolidayType } from "./types";

function holidayId(classSectionId: string, date: string) {
  return `${classSectionId}_${date}`;
}

export interface DeclareHolidayInput {
  schoolId: string;
  classSectionId: string;
  date: string;
  type: HolidayType;
  cancelledSession?: AttendanceSession; // required iff type === "HALF_DAY"
  reason?: string;
  markedByUid: string;
}

export async function declareHoliday(input: DeclareHolidayInput): Promise<void> {
  if (input.type === "HALF_DAY" && !input.cancelledSession) {
    throw new Error("Choose which session (Morning/Afternoon) is cancelled for a Half Day.");
  }
  await setDoc(doc(db, "attendanceHolidays", holidayId(input.classSectionId, input.date)), {
    schoolId: input.schoolId,
    classSectionId: input.classSectionId,
    date: input.date,
    type: input.type,
    ...(input.type === "HALF_DAY" ? { cancelledSession: input.cancelledSession } : {}),
    ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    markedByUid: input.markedByUid,
    createdAt: serverTimestamp(),
  });
}

export async function undoHolidayDeclaration(classSectionId: string, date: string): Promise<void> {
  await deleteDoc(doc(db, "attendanceHolidays", holidayId(classSectionId, date)));
}

/** Direct doc-id read — see the nonexistent-doc gotcha note in
 * firestore.rules (most dates have no holiday doc at all). undefined =
 * loading, null = not a holiday. */
export function subscribeToHoliday(
  classSectionId: string,
  date: string,
  callback: (holiday: AttendanceHoliday | null | undefined) => void
) {
  return onSnapshot(doc(db, "attendanceHolidays", holidayId(classSectionId, date)), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as Omit<AttendanceHoliday, "id" | "createdAt"> & { createdAt: Timestamp | null };
    callback({ ...data, id: snap.id, createdAt: data.createdAt ? data.createdAt.toMillis() : null });
  });
}

/** Whether `session` requires no attendance today, given the current
 * holiday declaration (if any). */
export function isSessionCancelled(
  holiday: AttendanceHoliday | null | undefined,
  session: AttendanceSession
): boolean {
  if (!holiday) return false;
  return holiday.type === "FULL_DAY" || holiday.cancelledSession === session;
}

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AttendanceSession, Holiday, HolidayType } from "./types";

function holidayId(schoolId: string, date: string) {
  return `${schoolId}_${date}`;
}

/** Every Sunday is a holiday by default — no stored document needed for the
 * common case. A stored `holidays/{schoolId}_{date}` doc is only for
 * exceptions: declared public holidays/vacations/emergency closures, or
 * overriding a default (e.g. a working Sunday — see Holiday.type). */
export function isDefaultHoliday(date: string): boolean {
  return new Date(`${date}T00:00:00`).getDay() === 0;
}

function mapHolidayDoc(docSnap: QueryDocumentSnapshot): Holiday {
  const data = docSnap.data() as Omit<Holiday, "id" | "createdAt"> & { createdAt: Timestamp | null };
  return { ...data, id: docSnap.id, createdAt: data.createdAt ? data.createdAt.toMillis() : null };
}

export interface DeclareHolidayInput {
  schoolId: string;
  date: string;
  type: HolidayType;
  cancelledSession?: AttendanceSession; // required iff type === "HALF_DAY"
  reason: string;
  createdByUid: string;
}

export async function declareHoliday(input: DeclareHolidayInput): Promise<void> {
  if (input.type === "HALF_DAY" && !input.cancelledSession) {
    throw new Error("Choose which session (Morning/Afternoon) is cancelled for a Half Day.");
  }
  await setDoc(doc(db, "holidays", holidayId(input.schoolId, input.date)), {
    schoolId: input.schoolId,
    date: input.date,
    type: input.type,
    ...(input.type === "HALF_DAY" ? { cancelledSession: input.cancelledSession } : {}),
    reason: input.reason,
    createdByUid: input.createdByUid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteHoliday(schoolId: string, date: string): Promise<void> {
  await deleteDoc(doc(db, "holidays", holidayId(schoolId, date)));
}

/** Direct doc-id read — undefined = loading, null = no declared holiday for
 * that date (still check isDefaultHoliday(date) for the Sunday default). */
export function subscribeToHoliday(
  schoolId: string,
  date: string,
  callback: (holiday: Holiday | null | undefined) => void
) {
  return onSnapshot(doc(db, "holidays", holidayId(schoolId, date)), (snap) => {
    callback(snap.exists() ? mapHolidayDoc(snap as QueryDocumentSnapshot) : null);
  });
}

/** Admin's Holidays calendar — every declared holiday in a date range. */
export function subscribeToHolidaysForRange(
  schoolId: string,
  startDate: string,
  endDate: string,
  callback: (holidays: Holiday[]) => void
) {
  const q = query(
    collection(db, "holidays"),
    where("schoolId", "==", schoolId),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapHolidayDoc)));
}

/** Whether `session` requires no attendance on `date`, given the current
 * holiday declaration (if any) and the default-Sunday rule. */
export function isSessionCancelled(
  date: string,
  holiday: Holiday | null | undefined,
  session: AttendanceSession
): boolean {
  if (holiday) {
    if (holiday.type === "FULL_DAY") return true;
    if (holiday.cancelledSession === session) return true;
    // A stored FULL_DAY/HALF_DAY doc always wins; anything else stored for
    // this date (there is no other type today) falls through to the default.
  }
  return isDefaultHoliday(date);
}

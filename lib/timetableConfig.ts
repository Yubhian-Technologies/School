import { doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { PeriodColumn, TimetableConfig } from "./types";

export async function savePeriods(input: { schoolId: string; periods: PeriodColumn[] }) {
  await setDoc(
    doc(db, "timetableConfigs", input.schoolId),
    {
      schoolId: input.schoolId,
      periods: input.periods,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToPeriods(
  schoolId: string,
  callback: (config: TimetableConfig | null) => void
) {
  return onSnapshot(doc(db, "timetableConfigs", schoolId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as {
      schoolId: string;
      periods: PeriodColumn[];
      updatedAt: Timestamp | null;
    };
    callback({
      schoolId: data.schoolId,
      periods: data.periods ?? [],
      updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
    });
  });
}

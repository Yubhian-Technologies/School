import { doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { DayOfWeek, GridRow, TimetableGrid } from "./types";

export const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function emptyCells(): Record<DayOfWeek, GridRow> {
  return {
    Mon: {},
    Tue: {},
    Wed: {},
    Thu: {},
    Fri: {},
    Sat: {},
  };
}

export interface SaveGridInput {
  schoolId: string;
  classId: string;
  sectionId: string;
  cells: Record<DayOfWeek, GridRow>;
}

export async function saveGrid(input: SaveGridInput) {
  await setDoc(doc(db, "timetableGrids", input.sectionId), {
    id: input.sectionId,
    schoolId: input.schoolId,
    classId: input.classId,
    sectionId: input.sectionId,
    cells: input.cells,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToGrid(
  sectionId: string,
  callback: (grid: TimetableGrid | null) => void
) {
  return onSnapshot(doc(db, "timetableGrids", sectionId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as {
      schoolId: string;
      classId: string;
      sectionId: string;
      cells: Record<DayOfWeek, GridRow>;
      updatedAt: Timestamp | null;
    };
    callback({
      id: snap.id,
      schoolId: data.schoolId,
      classId: data.classId,
      sectionId: data.sectionId,
      cells: data.cells,
      updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
    });
  });
}

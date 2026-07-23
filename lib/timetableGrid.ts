import {
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  SectionTimetable,
  SectionTimetableStatus,
  TimetableBreakDef,
  TimetableCellData,
  TimetableDayDef,
  TimetablePeriodDef,
} from "./types";

function cellKey(dayId: string, periodId: string) {
  return `${dayId}_${periodId}`;
}

// India-style academic year (April–March). There's no UI step asking for
// this, so it's derived instead of admin-entered.
function defaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_PERIOD_COUNT = 8;
const DEFAULT_BREAK_AFTER_PERIOD_INDEX = 3; // after Period 4 (0-based)

export interface CreateDefaultSectionTimetableInput {
  schoolId: string;
  classId: string;
  sectionId: string;
}

// Clicking "Create Timetable" should never make the admin build rows/columns
// by hand — this generates a real school timetable instantly: Mon-Sat
// columns, Period 1-8 rows, one Lunch Break after Period 4.
export async function createDefaultSectionTimetable(input: CreateDefaultSectionTimetableInput) {
  const days: TimetableDayDef[] = DEFAULT_DAY_LABELS.map((label, order) => ({
    id: crypto.randomUUID(),
    label,
    order,
  }));

  const periods: TimetablePeriodDef[] = Array.from({ length: DEFAULT_PERIOD_COUNT }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Period ${i + 1}`,
    order: i,
  }));

  const breaks: TimetableBreakDef[] = [
    {
      id: crypto.randomUUID(),
      label: "Lunch Break",
      durationMinutes: 40,
      afterPeriodId: periods[DEFAULT_BREAK_AFTER_PERIOD_INDEX].id,
    },
  ];

  await setDoc(doc(db, "timetableGrids", input.sectionId), {
    id: input.sectionId,
    schoolId: input.schoolId,
    classId: input.classId,
    sectionId: input.sectionId,
    academicYear: defaultAcademicYear(),
    name: "",
    effectiveDate: todayIso(),
    status: "draft",
    days,
    periods,
    breaks,
    cells: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToSectionTimetable(
  sectionId: string,
  callback: (timetable: SectionTimetable | null) => void
) {
  return onSnapshot(
    doc(db, "timetableGrids", sectionId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data() as {
        schoolId: string;
        classId: string;
        sectionId: string;
        academicYear: string;
        name: string;
        effectiveDate: string;
        status: SectionTimetableStatus;
        days: TimetableDayDef[];
        periods: TimetablePeriodDef[];
        breaks: TimetableBreakDef[];
        cells: Record<string, TimetableCellData>;
        createdAt: Timestamp | null;
        updatedAt: Timestamp | null;
      };
      callback({
        id: snap.id,
        schoolId: data.schoolId,
        classId: data.classId,
        sectionId: data.sectionId,
        academicYear: data.academicYear,
        name: data.name,
        effectiveDate: data.effectiveDate,
        status: data.status,
        days: data.days ?? [],
        periods: data.periods ?? [],
        breaks: data.breaks ?? [],
        cells: data.cells ?? {},
        createdAt: data.createdAt ? data.createdAt.toMillis() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
      });
    },
    // A still-draft timetable is a permission-denied read for anyone but its
    // school's admin — that's correct (drafts are admin-only), so it's
    // treated the same as "nothing to show" rather than a console error.
    () => callback(null)
  );
}

export interface UpdateStructureInput {
  sectionId: string;
  days: TimetableDayDef[];
  periods: TimetablePeriodDef[];
  breaks: TimetableBreakDef[];
  existingCellKeys: string[];
}

// Persists a structure edit. Renaming or reordering a day/period never
// touches `cells` (ids are stable) — only an actual removal prunes the cell
// keys that referenced it, so existing timetable data survives everything
// except a real delete. A break anchored to a removed period is silently
// reattached to the last remaining period, so it can never dangle.
export async function updateStructure(input: UpdateStructureInput) {
  const dayIds = new Set(input.days.map((d) => d.id));
  const periodIds = new Set(input.periods.map((p) => p.id));

  const sortedPeriods = [...input.periods].sort((a, b) => a.order - b.order);
  const lastPeriodId = sortedPeriods.length > 0 ? sortedPeriods[sortedPeriods.length - 1].id : null;

  const reattachedBreaks = input.breaks.map((b) =>
    b.afterPeriodId !== null && !periodIds.has(b.afterPeriodId)
      ? { ...b, afterPeriodId: lastPeriodId }
      : b
  );

  const updates: Record<string, unknown> = {
    days: input.days,
    periods: input.periods,
    breaks: reattachedBreaks,
    updatedAt: serverTimestamp(),
  };

  for (const key of input.existingCellKeys) {
    const [dayId, periodId] = key.split("_");
    if (!dayIds.has(dayId) || !periodIds.has(periodId)) {
      updates[`cells.${key}`] = deleteField();
    }
  }

  await updateDoc(doc(db, "timetableGrids", input.sectionId), updates);
}

export async function updateCell(
  sectionId: string,
  dayId: string,
  periodId: string,
  data: TimetableCellData
) {
  await updateDoc(doc(db, "timetableGrids", sectionId), {
    [`cells.${cellKey(dayId, periodId)}`]: data,
    updatedAt: serverTimestamp(),
  });
}

export async function clearCell(sectionId: string, dayId: string, periodId: string) {
  await updateDoc(doc(db, "timetableGrids", sectionId), {
    [`cells.${cellKey(dayId, periodId)}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function setStatus(sectionId: string, status: SectionTimetableStatus) {
  await updateDoc(doc(db, "timetableGrids", sectionId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

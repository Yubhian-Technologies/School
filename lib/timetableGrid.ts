import {
  collection,
  deleteField,
  doc,
  documentId,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
    startTime: null,
    endTime: null,
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

interface RawSectionTimetableDoc {
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
}

function mapSectionTimetableDoc(id: string, data: RawSectionTimetableDoc): SectionTimetable {
  return {
    id,
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
  };
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
      callback(mapSectionTimetableDoc(snap.id, snap.data() as RawSectionTimetableDoc));
    },
    // A still-draft timetable is a permission-denied read for anyone but its
    // school's admin — that's correct (drafts are admin-only), so it's
    // treated the same as "nothing to show" rather than a console error.
    () => callback(null)
  );
}

// Read-only view for Faculty/Parent (used by PublishedTimetableView), as a
// *query* rather than a direct doc() listener. A direct doc() listener on a
// still-draft timetable gets a permission-denied error the instant it's
// opened — and once a Firestore listener errors, the SDK tears it down for
// good; it will NOT start receiving updates again just because the document
// later becomes readable (e.g. the admin publishes it while this page is
// still open). A query that filters on exactly the fields the security rule
// needs never enters that error state to begin with: an unpublished/other-
// school doc simply isn't in the result set, and once it starts matching
// (school scoped + published) the listener picks it up like any other write.
// `schoolId` has to be pinned by its own equality filter too, or Firestore
// can't statically prove the rule for the query (same class of gotcha as
// `assertAdmissionNoAvailable` in lib/students.ts).
export function subscribeToPublishedSectionTimetable(
  schoolId: string,
  sectionId: string,
  callback: (timetable: SectionTimetable | null) => void
) {
  const q = query(
    collection(db, "timetableGrids"),
    where("schoolId", "==", schoolId),
    where(documentId(), "==", sectionId),
    where("status", "==", "published")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const docSnap = snapshot.docs[0];
      callback(docSnap ? mapSectionTimetableDoc(docSnap.id, docSnap.data() as RawSectionTimetableDoc) : null);
    },
    () => callback(null)
  );
}

// Every published timetable in the school, for building a faculty member's
// personal cross-class schedule (which class/section they're in at any given
// time) — the per-section grid view alone can't answer that. Statically
// provable by the `timetableGrids` read rule since both `schoolId` and
// `status` are pinned by equality filters here.
export function subscribeToPublishedTimetablesForSchool(
  schoolId: string,
  callback: (timetables: SectionTimetable[]) => void
) {
  const q = query(
    collection(db, "timetableGrids"),
    where("schoolId", "==", schoolId),
    where("status", "==", "published")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => mapSectionTimetableDoc(docSnap.id, docSnap.data() as RawSectionTimetableDoc))
      );
    },
    () => callback([])
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

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getClassLabel } from "@/lib/classes";
import { getClassSection } from "@/lib/classSections";
import { subscribeToFaculty } from "@/lib/faculty";
import { subscribeToSubjects } from "@/lib/subjects";
import {
  clearCell,
  createDefaultSectionTimetable,
  setStatus,
  subscribeToSectionTimetable,
  updateCell,
  updateStructure,
} from "@/lib/timetableGrid";
import type {
  ClassSection,
  Faculty,
  SectionTimetable,
  Subject,
  TimetableBreakDef,
  TimetableDayDef,
  TimetablePeriodDef,
} from "@/lib/types";
import { useToastStack, ToastStack } from "@/components/Toast";
import BreakManager, { validateBreaks } from "./BreakManager";
import CellEditorDialog from "./CellEditorDialog";
import DayManager, { validateDays } from "./DayManager";
import EmptyTimetableState from "./EmptyTimetableState";
import PeriodManager, { validatePeriods } from "./PeriodManager";
import PublishDialog from "./PublishDialog";
import TimetableGrid from "./TimetableGrid";
import TimetableSkeleton from "./TimetableSkeleton";
import TimetableToolbar from "./TimetableToolbar";

export default function SectionTimetablePage({
  classId,
  sectionId,
}: {
  classId: string;
  sectionId: string;
}) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);

  const [section, setSection] = useState<ClassSection | null>(null);
  const [timetable, setTimetable] = useState<SectionTimetable | null | undefined>(undefined);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingStructure, setEditingStructure] = useState(false);
  const [editDays, setEditDays] = useState<TimetableDayDef[]>([]);
  const [editPeriods, setEditPeriods] = useState<TimetablePeriodDef[]>([]);
  const [editBreaks, setEditBreaks] = useState<TimetableBreakDef[]>([]);
  const [savingStructure, setSavingStructure] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ dayId: string; periodId: string } | null>(null);

  const { toasts, show, dismiss } = useToastStack();

  useEffect(() => {
    getClassSection(sectionId).then(setSection);
  }, [sectionId]);

  useEffect(() => {
    return subscribeToSectionTimetable(sectionId, setTimetable);
  }, [sectionId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToFaculty(schoolId, setFaculty);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToSubjects(schoolId, classLabel, setSubjects);
  }, [schoolId, classLabel]);

  const cellCountsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const key of Object.keys(timetable?.cells ?? {})) {
      const dayId = key.split("_")[0];
      counts.set(dayId, (counts.get(dayId) ?? 0) + 1);
    }
    return counts;
  }, [timetable]);

  const cellCountsByPeriod = useMemo(() => {
    const counts = new Map<string, number>();
    for (const key of Object.keys(timetable?.cells ?? {})) {
      const periodId = key.split("_")[1];
      counts.set(periodId, (counts.get(periodId) ?? 0) + 1);
    }
    return counts;
  }, [timetable]);

  async function handleCreate() {
    if (!schoolId) return;
    setCreating(true);
    try {
      await createDefaultSectionTimetable({ schoolId, classId, sectionId });
      show("Timetable created.");
    } catch {
      show("Could not create the timetable. Please try again.", "error");
    } finally {
      setCreating(false);
    }
  }

  function startEditingStructure() {
    if (!timetable) return;
    setEditDays(timetable.days);
    setEditPeriods(timetable.periods);
    setEditBreaks(timetable.breaks);
    setEditingStructure(true);
  }

  function cancelEditingStructure() {
    setEditingStructure(false);
  }

  const structureError =
    validateDays(editDays) || validatePeriods(editPeriods) || validateBreaks(editBreaks);

  async function saveStructureChanges() {
    if (!timetable || structureError) return;
    setSavingStructure(true);
    try {
      await updateStructure({
        sectionId,
        days: editDays,
        periods: editPeriods,
        breaks: editBreaks,
        existingCellKeys: Object.keys(timetable.cells),
      });
      show("Timetable structure updated.");
      setEditingStructure(false);
    } catch {
      show("Could not save structure changes. Please try again.", "error");
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await setStatus(sectionId, "draft");
      show("Saved as draft.");
    } catch {
      show("Could not save. Please try again.", "error");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await setStatus(sectionId, "published");
      show("Published — now visible to Faculty & Parents.");
      setPublishDialogOpen(false);
    } catch {
      show("Could not publish. Please try again.", "error");
    } finally {
      setPublishing(false);
    }
  }

  const activeCellData =
    activeCell && timetable ? timetable.cells[`${activeCell.dayId}_${activeCell.periodId}`] : undefined;
  const activeCellLabel =
    activeCell && timetable
      ? `${timetable.days.find((d) => d.id === activeCell.dayId)?.label ?? ""} · ${
          timetable.periods.find((p) => p.id === activeCell.periodId)?.label ?? ""
        }`
      : "";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/admin/timetable/${classId}`}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← {classLabel} sections
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            {classLabel} · Section {section?.sectionName ?? "…"}
          </h1>
        </div>
      </div>

      <div className="mt-6">
        {timetable === undefined ? (
          <TimetableSkeleton />
        ) : timetable === null ? (
          <EmptyTimetableState onCreate={handleCreate} creating={creating} />
        ) : (
          <div className="space-y-4">
            <TimetableToolbar
              status={timetable.status}
              editingStructure={editingStructure}
              savingDraft={savingDraft}
              onToggleEditStructure={() =>
                editingStructure ? cancelEditingStructure() : startEditingStructure()
              }
              onSaveDraft={handleSaveDraft}
              onPublish={() => setPublishDialogOpen(true)}
            />

            {editingStructure && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Working Days</h3>
                  <DayManager
                    days={editDays}
                    onChange={setEditDays}
                    getCellCountForDay={(id) => cellCountsByDay.get(id) ?? 0}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Periods</h3>
                  <PeriodManager
                    periods={editPeriods}
                    onChange={setEditPeriods}
                    getCellCountForPeriod={(id) => cellCountsByPeriod.get(id) ?? 0}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Breaks</h3>
                  <BreakManager breaks={editBreaks} periods={editPeriods} onChange={setEditBreaks} />
                </div>
                <div className="col-span-full flex gap-3 border-t border-indigo-100 pt-3">
                  <button
                    onClick={cancelEditingStructure}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveStructureChanges}
                    disabled={savingStructure || Boolean(structureError)}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {savingStructure ? "Saving…" : "Save structure changes"}
                  </button>
                </div>
              </div>
            )}

            <TimetableGrid
              days={timetable.days}
              periods={timetable.periods}
              breaks={timetable.breaks}
              cells={timetable.cells}
              onCellClick={(dayId, periodId) => setActiveCell({ dayId, periodId })}
            />
          </div>
        )}
      </div>

      {activeCell && (
        <CellEditorDialog
          key={`${activeCell.dayId}_${activeCell.periodId}`}
          title={activeCellLabel}
          cell={activeCellData}
          faculty={faculty}
          subjects={subjects}
          onClose={() => setActiveCell(null)}
          onSave={async (data) => {
            await updateCell(sectionId, activeCell.dayId, activeCell.periodId, data);
            show("Cell updated.");
          }}
          onClear={async () => {
            await clearCell(sectionId, activeCell.dayId, activeCell.periodId);
            show("Cell cleared.");
          }}
        />
      )}

      {publishDialogOpen && (
        <PublishDialog
          busy={publishing}
          onConfirm={handlePublish}
          onCancel={() => setPublishDialogOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

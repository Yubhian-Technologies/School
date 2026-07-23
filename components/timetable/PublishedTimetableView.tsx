"use client";

import { useEffect, useState } from "react";
import { subscribeToSectionTimetable } from "@/lib/timetableGrid";
import type { SectionTimetable } from "@/lib/types";
import TimetableGrid from "./TimetableGrid";
import TimetableSkeleton from "./TimetableSkeleton";

export default function PublishedTimetableView({
  sectionId,
  highlightFacultyId,
}: {
  sectionId: string;
  /** Highlights this faculty's own periods — pass only from the Faculty timetable view. */
  highlightFacultyId?: string;
}) {
  const [timetable, setTimetable] = useState<SectionTimetable | null | undefined>(undefined);

  useEffect(() => {
    return subscribeToSectionTimetable(sectionId, setTimetable);
  }, [sectionId]);

  if (timetable === undefined) {
    return <TimetableSkeleton />;
  }

  if (timetable === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
        <p className="text-sm text-gray-500">Timetable not published yet.</p>
      </div>
    );
  }

  return (
    <TimetableGrid
      days={timetable.days}
      periods={timetable.periods}
      breaks={timetable.breaks}
      cells={timetable.cells}
      readOnly
      highlightFacultyId={highlightFacultyId ?? null}
    />
  );
}

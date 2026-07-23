"use client";

import type { SectionTimetableStatus } from "@/lib/types";

export default function TimetableToolbar({
  status,
  editingStructure,
  savingDraft,
  onToggleEditStructure,
  onSaveDraft,
  onPublish,
}: {
  status: SectionTimetableStatus;
  editingStructure: boolean;
  savingDraft: boolean;
  onToggleEditStructure: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          status === "published"
            ? "bg-green-50 text-green-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {status === "published" ? "Published" : "Draft"}
      </span>

      <button
        onClick={onToggleEditStructure}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          editingStructure
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {editingStructure ? "Done editing structure" : "Edit Structure"}
      </button>

      <button
        onClick={onSaveDraft}
        disabled={savingDraft}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        {savingDraft ? "Saving…" : "Save Draft"}
      </button>

      <button
        onClick={onPublish}
        disabled={status === "published"}
        className="ml-auto rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        Publish
      </button>
    </div>
  );
}

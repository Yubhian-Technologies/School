"use client";

import ConfirmDialog from "@/components/ConfirmDialog";

export default function PublishDialog({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      title="Publish this timetable?"
      message="Once published, this timetable becomes visible to Faculty and Parents for this section. You can still make edits afterward — this just controls visibility."
      confirmLabel="Publish"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

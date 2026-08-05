"use client";

import type { ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  // Full-screen-minus-sidebar by default (w-64, see components/Sidebar.tsx —
  // shared across every role) — every Modal caller across Super Admin,
  // Admin, Faculty, and Parent dashboards gets this automatically unless it
  // opts out (see ConfirmDialog and the Take Attendance submit confirm,
  // which explicitly restore the old small centered-popup look since a
  // Yes/No confirmation isn't an edit/view screen).
  maxWidthClassName = "max-w-none",
  maxHeightClassName = "h-full max-h-full",
  overlayPaddingClassName = "p-0",
  dialogDecorationClassName = "",
  overlayPositionClassName = "inset-y-0 left-64 right-0",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  maxHeightClassName?: string;
  overlayPaddingClassName?: string;
  dialogDecorationClassName?: string;
  overlayPositionClassName?: string;
}) {
  return (
    <div
      className={`fixed z-50 flex items-center justify-center bg-gray-900/40 ${overlayPositionClassName} ${overlayPaddingClassName}`}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        className={`relative ${maxHeightClassName} w-full ${maxWidthClassName} overflow-y-auto bg-white p-6 ${dialogDecorationClassName}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

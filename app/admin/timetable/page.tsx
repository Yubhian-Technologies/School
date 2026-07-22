"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Modal from "@/components/Modal";
import PeriodsEditor from "@/components/PeriodsEditor";
import { useAuth } from "@/context/AuthContext";
import { CLASS_LIST } from "@/lib/classes";

function ManagePeriodsParamWatcher({ onDetected }: { onDetected: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("managePeriods") === "1") {
      onDetected();
    }
  }, [searchParams, onDetected]);

  return null;
}

export default function AdminTimetablePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <Suspense fallback={null}>
        <ManagePeriodsParamWatcher onDetected={() => setModalOpen(true)} />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Timetable</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Manage periods
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {CLASS_LIST.map((cls) => (
          <Link
            key={cls.id}
            href={`/admin/timetable/${cls.id}`}
            className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-700"
          >
            {cls.label}
          </Link>
        ))}
      </div>

      {modalOpen && schoolId && (
        <Modal title="Manage periods" onClose={() => setModalOpen(false)} maxWidthClassName="max-w-2xl">
          <PeriodsEditor schoolId={schoolId} />
        </Modal>
      )}
    </div>
  );
}

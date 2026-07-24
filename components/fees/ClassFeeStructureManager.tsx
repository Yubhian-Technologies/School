"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { useToastStack, ToastStack } from "@/components/Toast";
import { getClassLabel } from "@/lib/classes";
import { getCurrentAcademicYear } from "@/lib/classSections";
import { saveFeeStructure, subscribeToFeeStructure, tuitionFeeForClass } from "@/lib/feeStructures";
import type { FeeStructure } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

function formatCurrency(amount: number) {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FeeStructureForm({
  schoolId,
  classId,
  academicYear,
  structure,
  onSaved,
  onError,
}: {
  schoolId: string;
  classId: string;
  academicYear: string;
  structure: FeeStructure | null;
  onSaved: (updated: boolean) => void;
  onError: () => void;
}) {
  const { profile } = useAuth();
  const tuition = tuitionFeeForClass(classId);

  const [books, setBooks] = useState(String(structure?.books ?? 0));
  const [uniform, setUniform] = useState(String(structure?.uniform ?? 0));
  const [saving, setSaving] = useState(false);

  const booksNum = Number(books) || 0;
  const uniformNum = Number(uniform) || 0;
  const total = tuition + booksNum + uniformNum;

  async function handleSave() {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await saveFeeStructure({
        schoolId,
        classId,
        academicYear,
        books: booksNum,
        uniform: uniformNum,
        updatedByUid: profile.uid,
      });
      onSaved(Boolean(structure));
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Tuition Fee</label>
          <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {formatCurrency(tuition)}
          </div>
          <p className="mt-1 text-xs text-gray-400">Fixed per class — not editable.</p>
        </div>

        <div>
          <label htmlFor="books-fee" className={labelClass}>
            Books Fee
          </label>
          <input
            id="books-fee"
            type="number"
            min="0"
            value={books}
            onChange={(e) => setBooks(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div>
          <label htmlFor="uniform-fee" className={labelClass}>
            Uniform Fee
          </label>
          <input
            id="uniform-fee"
            type="number"
            min="0"
            value={uniform}
            onChange={(e) => setUniform(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total Fee</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : structure ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function ClassFeeStructureManager({ classId }: { classId: string }) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classLabel = getClassLabel(classId);
  const academicYear = getCurrentAcademicYear();

  const [structure, setStructure] = useState<FeeStructure | null | undefined>(undefined);
  const { toasts, show, dismiss } = useToastStack();

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToFeeStructure(schoolId, classId, academicYear, setStructure);
  }, [schoolId, classId, academicYear]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/fees"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" /> Fees
        </Link>
        <PageHeader title={`${classLabel} — Fee Structure`} subtitle={`Academic year ${academicYear}`} />
      </div>

      {structure === undefined || !schoolId ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <FeeStructureForm
          key={structure?.updatedAt ?? "new"}
          schoolId={schoolId}
          classId={classId}
          academicYear={academicYear}
          structure={structure}
          onSaved={(updated) => show(updated ? "Fee structure updated." : "Fee structure saved.")}
          onError={() => show("Could not save the fee structure. Please try again.", "error")}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { CLASS_LIST } from "@/lib/classes";
import { getCurrentAcademicYear } from "@/lib/classSections";
import { subscribeToFeeStructure } from "@/lib/feeStructures";
import { saveStudentFeeDiscount, subscribeToStudentFee } from "@/lib/studentFees";
import type { FeeStructure, Student, StudentFee } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

function formatCurrency(amount: number) {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DiscountForm({
  student,
  academicYear,
  structure,
  existing,
  onClose,
}: {
  student: Student;
  academicYear: string;
  structure: FeeStructure;
  existing: StudentFee | null;
  onClose: () => void;
}) {
  const { profile } = useAuth();

  const [tuitionDiscountPct, setTuitionDiscountPct] = useState(String(existing?.tuitionDiscountPct ?? 0));
  const [booksDiscountPct, setBooksDiscountPct] = useState(String(existing?.booksDiscountPct ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const tuitionPct = Math.min(100, Math.max(0, Number(tuitionDiscountPct) || 0));
    const booksPct = Math.min(100, Math.max(0, Number(booksDiscountPct) || 0));
    const tuitionDiscountAmount = Math.round((structure.tuition * tuitionPct) / 100);
    const booksDiscountAmount = Math.round((structure.books * booksPct) / 100);
    const tuitionAfter = structure.tuition - tuitionDiscountAmount;
    const booksAfter = structure.books - booksDiscountAmount;
    const totalAmount = structure.tuition + structure.books + structure.uniform;
    const concessionAmount = tuitionDiscountAmount + booksDiscountAmount;
    const payable = totalAmount - concessionAmount;
    return {
      tuitionPct,
      booksPct,
      tuitionDiscountAmount,
      booksDiscountAmount,
      tuitionAfter,
      booksAfter,
      totalAmount,
      concessionAmount,
      payable,
    };
  }, [structure, tuitionDiscountPct, booksDiscountPct]);

  async function handleSave() {
    if (!profile?.uid) return;
    setError(null);
    setSaving(true);
    try {
      await saveStudentFeeDiscount({
        schoolId: student.schoolId,
        studentId: student.id,
        classSectionId: student.classSectionId,
        academicYear,
        tuitionFee: structure.tuition,
        booksFee: structure.books,
        uniformFee: structure.uniform,
        tuitionDiscountPct: preview.tuitionPct,
        booksDiscountPct: preview.booksPct,
        updatedByUid: profile.uid,
      });
      onClose();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Fee</th>
              <th className="px-3 py-2 text-right">After Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 text-gray-700">Tuition Fee</td>
              <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(structure.tuition)}</td>
              <td className="px-3 py-2 text-right font-medium text-gray-900">
                {formatCurrency(preview.tuitionAfter)}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-700">Books Fee</td>
              <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(structure.books)}</td>
              <td className="px-3 py-2 text-right font-medium text-gray-900">
                {formatCurrency(preview.booksAfter)}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-700">Uniform Fee</td>
              <td className="px-3 py-2 text-right text-gray-500" colSpan={2}>
                {formatCurrency(structure.uniform)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tuition-discount" className={labelClass}>
            Tuition Fee Discount (%)
          </label>
          <input
            id="tuition-discount"
            type="number"
            min="0"
            max="100"
            value={tuitionDiscountPct}
            onChange={(e) => setTuitionDiscountPct(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>
        <div>
          <label htmlFor="books-discount" className={labelClass}>
            Books Fee Discount (%)
          </label>
          <input
            id="books-discount"
            type="number"
            min="0"
            max="100"
            value={booksDiscountPct}
            onChange={(e) => setBooksDiscountPct(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>Total Fee</span>
          <span>{formatCurrency(preview.totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>Total Discount</span>
          <span>− {formatCurrency(preview.concessionAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 text-base font-bold text-gray-900">
          <span>Final Total Fee After Discount</span>
          <span>{formatCurrency(preview.payable)}</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        {saving ? "Saving…" : existing ? "Update" : "Save"}
      </button>
    </>
  );
}

export default function StudentFeeDetailModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;
  const classId = CLASS_LIST.find((c) => c.label === student.className)?.id ?? null;
  // Not student.academicYear — lib/students.ts stamps that in a different
  // format ("2026-27") than classSections/feeStructures use ("2026-2027"),
  // so a lookup keyed off the student's own field could silently 404 a fee
  // structure the admin already saved. getCurrentAcademicYear() is the same
  // helper the fee structure was saved under, so this always matches it.
  const academicYear = getCurrentAcademicYear();

  const [structure, setStructure] = useState<FeeStructure | null | undefined>(undefined);
  const [existing, setExisting] = useState<StudentFee | null | undefined>(undefined);

  useEffect(() => {
    if (!schoolId || !classId) return;
    return subscribeToFeeStructure(schoolId, classId, academicYear, setStructure);
  }, [schoolId, classId, academicYear]);

  useEffect(() => {
    return subscribeToStudentFee(student.id, setExisting);
  }, [student.id]);

  return (
    <Modal title={`${student.name} — Fee Details`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          <span>
            Student ID <span className="font-medium text-gray-900">{student.admissionNo}</span>
          </span>
          <span>
            Class{" "}
            <span className="font-medium text-gray-900">
              {student.className}
              {student.sectionName ? ` - ${student.sectionName}` : ""}
            </span>
          </span>
        </div>

        {!classId || structure === undefined || existing === undefined ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : structure === null ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No fee structure has been set for {student.className} yet.{" "}
            <Link href={`/admin/fees/${classId}`} className="font-semibold underline">
              Set it up first
            </Link>
            .
          </div>
        ) : (
          <DiscountForm
            key={existing?.updatedAt ?? "new"}
            student={student}
            academicYear={academicYear}
            structure={structure}
            existing={existing}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  );
}

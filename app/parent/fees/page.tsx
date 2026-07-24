"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { subscribeToLinkedStudent } from "@/lib/students";
import { subscribeToStudentFee } from "@/lib/studentFees";
import type { Student, StudentFee } from "@/lib/types";

function formatCurrency(amount: number) {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ParentFeesPage() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [fee, setFee] = useState<StudentFee | null | undefined>(undefined);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLinkedStudent(profile.uid, setStudent);
  }, [profile?.uid]);

  useEffect(() => {
    if (!student) return;
    return subscribeToStudentFee(student.id, setFee);
  }, [student]);

  return (
    <div className="space-y-8">
      <PageHeader title="Fees" />

      {student === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : student === null ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">No student linked to your account yet.</p>
        </div>
      ) : fee === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : fee === null ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">Fee details not available yet.</p>
        </div>
      ) : (
        <div className="max-w-xl space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            <span>
              Academic Year <span className="font-medium text-gray-900">{fee.academicYear}</span>
            </span>
            <span>
              Class{" "}
              <span className="font-medium text-gray-900">
                {student.className}
                {student.sectionName ? ` - ${student.sectionName}` : ""}
              </span>
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-right">Fee</th>
                  <th className="px-4 py-2.5 text-right">Discount</th>
                  <th className="px-4 py-2.5 text-right">After Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-gray-700">Tuition Fee</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(fee.tuitionFee)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {fee.tuitionDiscountPct > 0
                      ? `${fee.tuitionDiscountPct}% (− ${formatCurrency(fee.tuitionDiscountAmount)})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(fee.tuitionFee - fee.tuitionDiscountAmount)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">Books Fee</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(fee.booksFee)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {fee.booksDiscountPct > 0
                      ? `${fee.booksDiscountPct}% (− ${formatCurrency(fee.booksDiscountAmount)})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(fee.booksFee - fee.booksDiscountAmount)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">Uniform Fee</td>
                  <td className="px-4 py-3 text-right text-gray-500" colSpan={3}>
                    {formatCurrency(fee.uniformFee)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total Fee</span>
              <span>{formatCurrency(fee.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total Discount</span>
              <span>− {formatCurrency(fee.concessionAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 text-base font-bold text-gray-900">
              <span>Final Total Fee After Discount</span>
              <span>{formatCurrency(fee.payable)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

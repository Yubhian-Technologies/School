"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { CLASS_LIST } from "@/lib/classes";
import { findStudentsByAdmissionNo } from "@/lib/students";
import type { Student } from "@/lib/types";
import StudentFeeDetailModal from "@/components/fees/StudentFeeDetailModal";

export default function AdminFeesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Student[] | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!schoolId || !searchTerm.trim()) return;
    setSearching(true);
    setSearchError(null);
    setMatches(null);
    try {
      const results = await findStudentsByAdmissionNo(schoolId, searchTerm);
      if (results.length === 0) {
        setSearchError(`No student found with Student ID "${searchTerm.trim()}".`);
      } else if (results.length === 1) {
        setSelectedStudent(results[0]);
      } else {
        setMatches(results);
      }
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Fees" subtitle="Class fee structures and per-student discounts" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Search Student by ID</h2>
        <form onSubmit={handleSearch} className="mt-2 flex gap-2">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g. STU2026001"
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={searching || !searchTerm.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchError && <p className="mt-3 text-sm text-red-600">{searchError}</p>}

        {matches && matches.length > 1 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500">
              Multiple students share this Student ID — pick the right one:
            </p>
            {matches.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStudent(s);
                  setMatches(null);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <span className="font-medium text-gray-900">{s.name}</span>
                <span className="text-gray-500">
                  {s.className}
                  {s.sectionName ? ` - ${s.sectionName}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700">Select a Class</h2>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CLASS_LIST.map((cls) => (
            <Link
              key={cls.id}
              href={`/admin/fees/${cls.id}`}
              className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <p className="font-semibold text-gray-900">{cls.label}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
            </Link>
          ))}
        </div>
      </div>

      {selectedStudent && (
        <StudentFeeDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

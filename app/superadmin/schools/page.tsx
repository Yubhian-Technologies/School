"use client";

import { useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/Modal";
import { createSchool, subscribeToSchools } from "@/lib/schools";
import type { School } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

export default function SuperAdminSchoolsPage() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => subscribeToSchools(setSchools), []);

  function resetForm() {
    setName("");
    setPlace("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createSchool({ name, place });
      resetForm();
      setModalOpen(false);
    } catch {
      setError("Could not create school. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Schools</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Create school
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {schools === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : schools.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No schools yet — create one to get started.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Place</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schools.map((school) => (
                <tr key={school.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{school.name}</td>
                  <td className="px-4 py-3 text-gray-600">{school.place}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="Create school"
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="school-name" className={labelClass}>
                School name
              </label>
              <input
                id="school-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="school-place" className={labelClass}>
                Place
              </label>
              <input
                id="school-place"
                required
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create school"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

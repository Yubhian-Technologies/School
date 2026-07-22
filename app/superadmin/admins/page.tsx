"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Modal from "@/components/Modal";
import { createAdmin, subscribeToAdmins } from "@/lib/admins";
import { subscribeToSchools } from "@/lib/schools";
import type { School, UserProfile } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<UserProfile[] | null>(null);
  const [schools, setSchools] = useState<School[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => subscribeToAdmins(setAdmins), []);
  useEffect(() => subscribeToSchools(setSchools), []);

  const schoolNameById = useMemo(() => {
    const map = new Map<string, string>();
    schools?.forEach((school) => map.set(school.id, school.name));
    return map;
  }, [schools]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setSchoolId("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!schoolId) {
      setError("Select a school to assign this admin to.");
      return;
    }

    setSubmitting(true);
    try {
      await createAdmin({ name, email, password, phone, schoolId });
      resetForm();
      setModalOpen(false);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/email-already-in-use"
          ? "That email is already in use."
          : "Could not create admin. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">School Admins</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Create admin
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {admins === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No admins yet — create one to get started.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">School</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin.uid}>
                  <td className="px-4 py-3 font-medium text-gray-900">{admin.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                  <td className="px-4 py-3 text-gray-600">{admin.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {admin.schoolId ? (schoolNameById.get(admin.schoolId) ?? admin.schoolId) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="Create admin"
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-name" className={labelClass}>
                Name
              </label>
              <input
                id="admin-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="admin-email" className={labelClass}>
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className={labelClass}>
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="admin-phone" className={labelClass}>
                Phone number
              </label>
              <input
                id="admin-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="admin-school" className={labelClass}>
                School
              </label>
              <select
                id="admin-school"
                required
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  {schools === null
                    ? "Loading schools…"
                    : schools.length === 0
                      ? "No schools yet — create one first"
                      : "Select a school"}
                </option>
                {schools?.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || schools === null || schools.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create admin"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/lib/users";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

export default function SuperAdminProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSubmitting(true);
    try {
      await updateUserProfile(user.uid, { name, phone });
      await refreshProfile();
      setEditing(false);
    } catch {
      setError("Could not save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">Profile</h1>

      <div className="mt-6 max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {profile === null ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className={labelClass}>
                Name
              </label>
              <input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className={labelClass}>
                Phone
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" value={profile.name ?? "—"} />
              <Field label="Email" value={profile.email} />
              <Field label="Phone" value={profile.phone ?? "—"} />
              <Field label="Role" value="Super Admin" />
            </div>

            <button
              onClick={startEditing}
              className="mt-6 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Edit details
            </button>
          </>
        )}
      </div>
    </div>
  );
}

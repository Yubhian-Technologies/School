"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import {
  createFaculty,
  deleteFaculty,
  subscribeToFaculty,
  updateFaculty,
} from "@/lib/faculty";
import type { Faculty } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";
const disabledInputClass = `${inputClass} bg-gray-50 text-gray-500`;

interface FacultyFormState {
  name: string;
  gender: "Male" | "Female" | "";
  dob: string;
  mobile: string;
  email: string;
  qualification: string;
  subjects: string;
  designation: string;
  doj: string;
  experience: string;
  hasPriorExperience: "Yes" | "No";
  previousSchool: string;
  address: string;
  emergencyContact: string;
  password: string;
  status: "Active" | "Inactive";
}

const emptyForm: FacultyFormState = {
  name: "",
  gender: "",
  dob: "",
  mobile: "",
  email: "",
  qualification: "",
  subjects: "",
  designation: "",
  doj: "",
  experience: "0",
  hasPriorExperience: "No",
  previousSchool: "",
  address: "",
  emergencyContact: "",
  password: "",
  status: "Active",
};

export default function AdminFacultyPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [faculty, setFaculty] = useState<Faculty[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState<FacultyFormState>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [viewFaculty, setViewFaculty] = useState<Faculty | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    return subscribeToFaculty(schoolId, setFaculty);
  }, [schoolId]);

  const isEditing = editingUid !== null;

  function updateField<K extends keyof FacultyFormState>(key: K, value: FacultyFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateHasPriorExperience(value: "Yes" | "No") {
    setForm((f) => ({
      ...f,
      hasPriorExperience: value,
      experience: value === "Yes" ? (f.experience === "0" ? "" : f.experience) : "0",
      previousSchool: value === "Yes" ? f.previousSchool : "",
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingUid(null);
    setError(null);
  }

  function openAddModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(f: Faculty) {
    setForm({
      name: f.name,
      gender: f.gender,
      dob: f.dob,
      mobile: f.mobile,
      email: f.email,
      qualification: f.qualification,
      subjects: f.subjects,
      designation: f.designation,
      doj: f.doj,
      experience: f.experience,
      hasPriorExperience: f.hasPriorExperience,
      previousSchool: f.previousSchool,
      address: f.address,
      emergencyContact: f.emergencyContact,
      password: "",
      status: f.status,
    });
    setPhotoFile(null);
    setPhotoPreview(f.photoURL);
    setEditingUid(f.uid);
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : (photoPreview ?? null));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.gender) {
      setError("Select a gender.");
      return;
    }
    if (!isEditing && form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.hasPriorExperience === "Yes" && !form.experience.trim()) {
      setError("Enter the faculty's years of experience.");
      return;
    }
    if (form.hasPriorExperience === "Yes" && !form.previousSchool.trim()) {
      setError("Enter the previous school the faculty taught at.");
      return;
    }
    if (!schoolId) {
      setError("No school is associated with this account.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingUid) {
        await updateFaculty(editingUid, {
          name: form.name,
          gender: form.gender,
          dob: form.dob,
          mobile: form.mobile,
          qualification: form.qualification,
          subjects: form.subjects,
          designation: form.designation,
          doj: form.doj,
          experience: form.experience,
          hasPriorExperience: form.hasPriorExperience,
          previousSchool: form.previousSchool,
          address: form.address,
          emergencyContact: form.emergencyContact,
          status: form.status,
          photo: photoFile,
        });
      } else {
        await createFaculty({
          schoolId,
          name: form.name,
          gender: form.gender,
          dob: form.dob,
          mobile: form.mobile,
          email: form.email,
          qualification: form.qualification,
          subjects: form.subjects,
          designation: form.designation,
          doj: form.doj,
          experience: form.experience,
          hasPriorExperience: form.hasPriorExperience,
          previousSchool: form.previousSchool,
          address: form.address,
          emergencyContact: form.emergencyContact,
          password: form.password,
          status: form.status,
          photo: photoFile,
        });
      }
      closeModal();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/email-already-in-use"
          ? "That email is already in use."
          : `Could not ${isEditing ? "update" : "save"} faculty. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(f: Faculty) {
    if (!window.confirm(`Delete ${f.name} (${f.facultyId})? This cannot be undone.`)) return;
    setDeletingUid(f.uid);
    try {
      await deleteFaculty(f.uid);
      if (viewFaculty?.uid === f.uid) setViewFaculty(null);
    } finally {
      setDeletingUid(null);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    const match = faculty?.find(
      (f) => f.facultyId.toLowerCase() === term || f.mobile.toLowerCase() === term
    );
    if (match) {
      setViewFaculty(match);
    } else {
      setViewFaculty(null);
      setSearchError("No faculty found with that Faculty ID or Mobile Number.");
    }
  }

  const sortedFaculty = useMemo(() => faculty ?? [], [faculty]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Faculty</h1>
        <button
          onClick={openAddModal}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Add Faculty
        </button>
      </div>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Faculty ID or Mobile Number"
          className={`${inputClass} mt-0 max-w-sm`}
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Search Faculty
        </button>
      </form>
      {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {faculty === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : sortedFaculty.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No faculty yet — add one to get started.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Faculty ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedFaculty.map((f) => (
                <tr key={f.uid}>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.facultyId}</td>
                  <td className="px-4 py-3 text-gray-600">{f.name}</td>
                  <td className="px-4 py-3 text-gray-600">{f.designation}</td>
                  <td className="px-4 py-3 text-gray-600">{f.mobile}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.status === "Active"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setViewFaculty(f)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(f)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        disabled={deletingUid === f.uid}
                        className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                      >
                        {deletingUid === f.uid ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={isEditing ? "Edit Faculty" : "Add Faculty"}
          onClose={closeModal}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="faculty-photo" className={labelClass}>
                Upload Profile Photo
              </label>
              <div className="mt-1 flex items-center gap-3">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                    No photo
                  </div>
                )}
                <input
                  id="faculty-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="text-sm text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Faculty ID</label>
                <input
                  disabled
                  value={isEditing ? (faculty?.find((f) => f.uid === editingUid)?.facultyId ?? "") : "Auto-generated on save"}
                  className={disabledInputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-name" className={labelClass}>
                  Faculty Name
                </label>
                <input
                  id="faculty-name"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-gender" className={labelClass}>
                  Gender
                </label>
                <select
                  id="faculty-gender"
                  required
                  value={form.gender}
                  onChange={(e) => updateField("gender", e.target.value as FacultyFormState["gender"])}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label htmlFor="faculty-dob" className={labelClass}>
                  Date of Birth
                </label>
                <input
                  id="faculty-dob"
                  type="date"
                  required
                  value={form.dob}
                  onChange={(e) => updateField("dob", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-mobile" className={labelClass}>
                  Mobile Number
                </label>
                <input
                  id="faculty-mobile"
                  type="tel"
                  required
                  value={form.mobile}
                  onChange={(e) => updateField("mobile", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-email" className={labelClass}>
                  Email Address
                </label>
                <input
                  id="faculty-email"
                  type="email"
                  required
                  disabled={isEditing}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={isEditing ? disabledInputClass : inputClass}
                />
              </div>

              {!isEditing && (
                <div>
                  <label htmlFor="faculty-password" className={labelClass}>
                    Password
                  </label>
                  <input
                    id="faculty-password"
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label htmlFor="faculty-qualification" className={labelClass}>
                  Qualification
                </label>
                <input
                  id="faculty-qualification"
                  required
                  value={form.qualification}
                  onChange={(e) => updateField("qualification", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-subjects" className={labelClass}>
                  Subject(s) Assigned
                </label>
                <input
                  id="faculty-subjects"
                  required
                  placeholder="e.g. Mathematics, Physics"
                  value={form.subjects}
                  onChange={(e) => updateField("subjects", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-designation" className={labelClass}>
                  Designation
                </label>
                <input
                  id="faculty-designation"
                  required
                  value={form.designation}
                  onChange={(e) => updateField("designation", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-doj" className={labelClass}>
                  Date of Joining
                </label>
                <input
                  id="faculty-doj"
                  type="date"
                  required
                  value={form.doj}
                  onChange={(e) => updateField("doj", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-has-experience" className={labelClass}>
                  Has Prior Teaching Experience?
                </label>
                <select
                  id="faculty-has-experience"
                  required
                  value={form.hasPriorExperience}
                  onChange={(e) => updateHasPriorExperience(e.target.value as "Yes" | "No")}
                  className={inputClass}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label htmlFor="faculty-experience" className={labelClass}>
                  Experience
                </label>
                {form.hasPriorExperience === "Yes" ? (
                  <input
                    id="faculty-experience"
                    required
                    placeholder="e.g. 5 years"
                    value={form.experience}
                    onChange={(e) => updateField("experience", e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input id="faculty-experience" disabled value="0" className={disabledInputClass} />
                )}
              </div>

              {form.hasPriorExperience === "Yes" && (
                <div>
                  <label htmlFor="faculty-previous-school" className={labelClass}>
                    Previous School
                  </label>
                  <input
                    id="faculty-previous-school"
                    required
                    placeholder="School the faculty previously taught at"
                    value={form.previousSchool}
                    onChange={(e) => updateField("previousSchool", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label htmlFor="faculty-emergency" className={labelClass}>
                  Emergency Contact Number
                </label>
                <input
                  id="faculty-emergency"
                  type="tel"
                  required
                  value={form.emergencyContact}
                  onChange={(e) => updateField("emergencyContact", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="faculty-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="faculty-status"
                  required
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value as FacultyFormState["status"])}
                  className={inputClass}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="faculty-address" className={labelClass}>
                Address
              </label>
              <textarea
                id="faculty-address"
                required
                rows={2}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
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
              {submitting ? "Saving…" : isEditing ? "Update Faculty" : "Save Faculty"}
            </button>
          </form>
        </Modal>
      )}

      {viewFaculty && (
        <Modal
          title="Faculty Profile"
          onClose={() => setViewFaculty(null)}
          maxWidthClassName="max-w-lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewFaculty.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewFaculty.photoURL}
                  alt={viewFaculty.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                  {viewFaculty.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-gray-900">{viewFaculty.name}</p>
                <p className="text-sm text-gray-500">{viewFaculty.facultyId}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Gender", viewFaculty.gender],
                ["Date of Birth", viewFaculty.dob],
                ["Mobile Number", viewFaculty.mobile],
                ["Email Address", viewFaculty.email],
                ["Qualification", viewFaculty.qualification],
                ["Subject(s) Assigned", viewFaculty.subjects],
                ["Designation", viewFaculty.designation],
                ["Date of Joining", viewFaculty.doj],
                ["Has Prior Teaching Experience?", viewFaculty.hasPriorExperience],
                ["Experience", viewFaculty.experience || "—"],
                ...(viewFaculty.hasPriorExperience === "Yes"
                  ? ([["Previous School", viewFaculty.previousSchool]] as const)
                  : []),
                ["Emergency Contact", viewFaculty.emergencyContact],
                ["Status", viewFaculty.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-gray-800">{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Address
                </dt>
                <dd className="mt-0.5 text-gray-800">{viewFaculty.address}</dd>
              </div>
            </dl>

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  setViewFaculty(null);
                  openEditModal(viewFaculty);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(viewFaculty)}
                disabled={deletingUid === viewFaculty.uid}
                className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                {deletingUid === viewFaculty.uid ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

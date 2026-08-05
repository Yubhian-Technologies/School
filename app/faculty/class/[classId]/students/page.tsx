"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import {
  backfillLoginEmails,
  backfillParentClassLinks,
  createStudent,
  deleteStudent,
  emptyParentDetails,
  generateTempPassword,
  subscribeToStudentsForClass,
  updateStudent,
  type ParentDetails,
  type StudentFields,
} from "@/lib/students";
import type { ClassSection, Student } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";
const disabledInputClass = `${inputClass} bg-gray-50 text-gray-500`;

interface StudentFormState extends Omit<StudentFields, "gender"> {
  gender: "Male" | "Female" | "";
}

const emptyForm: StudentFormState = {
  admissionNo: "",
  name: "",
  rollNo: "",
  admissionDate: "",
  dob: "",
  gender: "",
  aadhaarNo: "",
  bloodGroup: "",
  category: "",
  house: "",
  previousSchool: "",
  addressLine: "",
  pinCode: "",
  medicalHistory: "",
  father: emptyParentDetails(),
  mother: emptyParentDetails(),
  guardian: emptyParentDetails(),
};

function ParentFieldset({
  legend,
  optional,
  value,
  onChange,
  idPrefix,
}: {
  legend: string;
  optional?: boolean;
  value: ParentDetails;
  onChange: (next: ParentDetails) => void;
  idPrefix: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-900">
        {legend}
        {optional && <span className="ml-1 font-normal text-gray-400">(if any)</span>}
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${idPrefix}-name`} className={labelClass}>
            Name
          </label>
          <input
            id={`${idPrefix}-name`}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-mobile`} className={labelClass}>
            Phone Number
          </label>
          <input
            id={`${idPrefix}-mobile`}
            type="tel"
            value={value.mobile}
            onChange={(e) => onChange({ ...value, mobile: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-occupation`} className={labelClass}>
            Occupation
          </label>
          <input
            id={`${idPrefix}-occupation`}
            value={value.occupation}
            onChange={(e) => onChange({ ...value, occupation: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </fieldset>
  );
}

export default function ClassStudentsPage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[] | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState(generateTempPassword());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [digitalIdFile, setDigitalIdFile] = useState<File | null>(null);
  const [existingDigitalId, setExistingDigitalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToStudentsForClass(schoolId, mySection.id, setStudents);
  }, [schoolId, mySection]);

  // Self-heals students created before parentClassLinks existed, so their
  // parent can read class-scoped collections (e.g. Assignments) — see
  // backfillParentClassLinks for why this can't run from the parent's side.
  useEffect(() => {
    if (!students || students.length === 0) return;
    backfillParentClassLinks(students);
    backfillLoginEmails(students);
  }, [students]);

  const isEditing = editingStudent !== null;

  function updateField<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setLoginEmail("");
    setLoginPassword(generateTempPassword());
    setPhotoFile(null);
    setPhotoPreview(null);
    setDigitalIdFile(null);
    setExistingDigitalId(null);
    setError(null);
    setEditingStudent(null);
  }

  function openAddModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(s: Student) {
    setForm({
      admissionNo: s.admissionNo,
      name: s.name,
      rollNo: s.rollNo,
      admissionDate: s.admissionDate ?? "",
      dob: s.dob ?? "",
      gender: (s.gender as "Male" | "Female" | "") ?? "",
      aadhaarNo: s.aadhaarNo ?? "",
      bloodGroup: s.bloodGroup ?? "",
      category: s.category ?? "",
      house: s.house ?? "",
      previousSchool: s.previousSchool ?? "",
      addressLine: s.address?.current ?? "",
      pinCode: s.address?.pinCode ?? "",
      medicalHistory: s.medical?.history ?? "",
      father: { name: s.father?.name ?? "", mobile: s.father?.mobile ?? "", occupation: s.father?.occupation ?? "" },
      mother: { name: s.mother?.name ?? "", mobile: s.mother?.mobile ?? "", occupation: s.mother?.occupation ?? "" },
      guardian: {
        name: s.guardian?.name ?? "",
        mobile: s.guardian?.mobile ?? "",
        occupation: s.guardian?.occupation ?? "",
      },
    });
    setPhotoFile(null);
    setPhotoPreview(s.photoUrl ?? null);
    setDigitalIdFile(null);
    setExistingDigitalId(s.digitalId ?? null);
    setError(null);
    setEditingStudent(s);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : (isEditing ? photoPreview : null));
  }

  function handleDigitalIdChange(e: ChangeEvent<HTMLInputElement>) {
    setDigitalIdFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.gender) {
      setError("Select a gender.");
      return;
    }
    if (!schoolId || !user || !mySection) {
      setError("No class is assigned to this account yet.");
      return;
    }
    if (!isEditing && loginPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingStudent) {
        await updateStudent(schoolId, mySection.id, editingStudent.id, {
          ...form,
          className: mySection.className,
          sectionName: mySection.sectionName,
          photo: photoFile,
          digitalIdFile,
        });
        closeModal();
      } else {
        await createStudent({
          schoolId,
          classSectionId: mySection.id,
          createdByUid: user.uid,
          photo: photoFile,
          digitalIdFile,
          ...form,
          className: mySection.className,
          sectionName: mySection.sectionName,
          loginEmail,
          loginPassword,
        });
        closeModal();
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      const message = err instanceof Error ? err.message : null;
      setError(
        code === "auth/email-already-in-use"
          ? "That login email is already in use."
          : message || `Could not ${isEditing ? "update" : "save"} student. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(s: Student) {
    if (!window.confirm(`Delete ${s.name} (${s.admissionNo})? This cannot be undone.`)) return;
    setDeletingId(s.id);
    try {
      await deleteStudent(s);
      if (viewStudent?.id === s.id) setViewStudent(null);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? `Student record deleted, but: ${err.message}`
          : "Could not fully delete this student."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const sortedStudents = useMemo(() => students ?? [], [students]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedStudents;
    return sortedStudents.filter(
      (s) => s.name.toLowerCase().includes(term) || s.rollNo.toLowerCase().includes(term)
    );
  }, [sortedStudents, searchTerm]);

  const parentEntries = viewStudent
    ? ([
        ["Father", viewStudent.father],
        ["Mother", viewStudent.mother],
        ["Guardian", viewStudent.guardian],
      ] as const).filter(([, info]) => info && info.name)
    : [];

  if (mySection === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (mySection === null) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Student Directory</h1>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            You haven&apos;t been assigned as a Class Teacher yet. Ask your Admin to assign you to a
            class &amp; section under Admin · Classes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-500">
            {mySection.className} — Section {mySection.sectionName}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Add Student
        </button>
      </div>

      <div className="mt-4">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Name or Roll Number"
          className={`${inputClass} mt-0 max-w-sm`}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {students === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : sortedStudents.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No students yet — add one to get started.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Admission ID</th>
                <th className="px-4 py-3">Parent Mobile</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
              filteredStudents.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.rollNo}</td>
                  <td className="px-4 py-3 text-gray-600">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.admissionNo}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.father?.mobile || s.mother?.mobile || s.guardian?.mobile || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setViewStudent(s)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(s)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                      >
                        {deletingId === s.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={isEditing ? "Edit Student" : "Add Student"}
          onClose={closeModal}
          maxWidthClassName="max-w-none"
          maxHeightClassName="h-full max-h-full"
          overlayPaddingClassName="p-0"
          dialogDecorationClassName=""
          overlayPositionClassName="inset-y-0 left-64 right-0"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="student-photo" className={labelClass}>
                  Student Photograph
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt="Student preview"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                      No photo
                    </div>
                  )}
                  <input
                    id="student-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-sm text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="student-digital-id" className={labelClass}>
                  Digital ID (upload photo or PDF)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {existingDigitalId && !digitalIdFile && (
                    <a
                      href={existingDigitalId}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      View current file
                    </a>
                  )}
                  <input
                    id="student-digital-id"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleDigitalIdChange}
                    className="text-sm text-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="student-id" className={labelClass}>
                    Admission ID
                  </label>
                  <input
                    id="student-id"
                    required
                    value={form.admissionNo}
                    onChange={(e) => updateField("admissionNo", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-name" className={labelClass}>
                    Student Name
                  </label>
                  <input
                    id="student-name"
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-dob" className={labelClass}>
                    Date of Birth
                  </label>
                  <input
                    id="student-dob"
                    type="date"
                    required
                    value={form.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-gender" className={labelClass}>
                    Gender
                  </label>
                  <select
                    id="student-gender"
                    required
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value as StudentFormState["gender"])}
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
                  <label htmlFor="student-aadhaar" className={labelClass}>
                    Aadhaar Number
                  </label>
                  <input
                    id="student-aadhaar"
                    value={form.aadhaarNo}
                    onChange={(e) => updateField("aadhaarNo", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-blood-group" className={labelClass}>
                    Blood Group
                  </label>
                  <input
                    id="student-blood-group"
                    value={form.bloodGroup}
                    onChange={(e) => updateField("bloodGroup", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-category" className={labelClass}>
                    Caste / Category
                  </label>
                  <input
                    id="student-category"
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-house" className={labelClass}>
                    House Name
                  </label>
                  <input
                    id="student-house"
                    value={form.house}
                    onChange={(e) => updateField("house", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Class</label>
                  <input disabled value={mySection.className} className={disabledInputClass} />
                </div>

                <div>
                  <label className={labelClass}>Section</label>
                  <input disabled value={mySection.sectionName} className={disabledInputClass} />
                </div>

                <div>
                  <label htmlFor="student-roll-no" className={labelClass}>
                    Roll Number
                  </label>
                  <input
                    id="student-roll-no"
                    required
                    value={form.rollNo}
                    onChange={(e) => updateField("rollNo", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-admission-date" className={labelClass}>
                    Admission Date
                  </label>
                  <input
                    id="student-admission-date"
                    type="date"
                    required
                    value={form.admissionDate}
                    onChange={(e) => updateField("admissionDate", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-previous-school" className={labelClass}>
                    Previous School
                  </label>
                  <input
                    id="student-previous-school"
                    value={form.previousSchool}
                    onChange={(e) => updateField("previousSchool", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="student-pincode" className={labelClass}>
                    PIN Code
                  </label>
                  <input
                    id="student-pincode"
                    value={form.pinCode}
                    onChange={(e) => updateField("pinCode", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="student-address" className={labelClass}>
                  Address
                </label>
                <textarea
                  id="student-address"
                  rows={2}
                  value={form.addressLine}
                  onChange={(e) => updateField("addressLine", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="student-medical" className={labelClass}>
                  Medical History
                </label>
                <textarea
                  id="student-medical"
                  rows={2}
                  value={form.medicalHistory}
                  onChange={(e) => updateField("medicalHistory", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Parent Details</h3>
                <ParentFieldset
                  legend="Father"
                  value={form.father}
                  onChange={(v) => updateField("father", v)}
                  idPrefix="father"
                />
                <ParentFieldset
                  legend="Mother"
                  value={form.mother}
                  onChange={(v) => updateField("mother", v)}
                  idPrefix="mother"
                />
                <ParentFieldset
                  legend="Guardian"
                  optional
                  value={form.guardian}
                  onChange={(v) => updateField("guardian", v)}
                  idPrefix="guardian"
                />
              </div>

              {!isEditing && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900">Login (used by parent)</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    One login is created for the student record — whichever parent signs in uses this
                    email and password.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="login-email" className={labelClass}>
                        Email
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="login-password" className={labelClass}>
                        Password
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id="login-password"
                          required
                          minLength={6}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className={`${inputClass} mt-0`}
                        />
                        <button
                          type="button"
                          onClick={() => setLoginPassword(generateTempPassword())}
                          className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting ? "Saving…" : isEditing ? "Update Student" : "Save Student"}
              </button>
          </form>
        </Modal>
      )}

      {viewStudent && (
        <Modal
          title="Student Profile"
          onClose={() => setViewStudent(null)}
          maxWidthClassName="max-w-none"
          maxHeightClassName="h-full max-h-full"
          overlayPaddingClassName="p-0"
          dialogDecorationClassName=""
          overlayPositionClassName="inset-y-0 left-64 right-0"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewStudent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewStudent.photoUrl}
                  alt={viewStudent.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                  {viewStudent.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-gray-900">{viewStudent.name}</p>
                <p className="text-sm text-gray-500">{viewStudent.admissionNo}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Roll No", viewStudent.rollNo],
                ["Class", `${viewStudent.className ?? "—"} ${viewStudent.sectionName ?? ""}`],
                ["Date of Birth", viewStudent.dob || "—"],
                ["Gender", viewStudent.gender || "—"],
                ["Aadhaar Number", viewStudent.aadhaarNo || "—"],
                ["Blood Group", viewStudent.bloodGroup || "—"],
                ["Caste / Category", viewStudent.category || "—"],
                ["House Name", viewStudent.house || "—"],
                ["Admission Date", viewStudent.admissionDate || "—"],
                ["Previous School", viewStudent.previousSchool || "—"],
                ["PIN Code", viewStudent.address?.pinCode || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                  <dd className="mt-0.5 text-gray-800">{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Address</dt>
                <dd className="mt-0.5 text-gray-800">{viewStudent.address?.current || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Medical History
                </dt>
                <dd className="mt-0.5 text-gray-800">{viewStudent.medical?.history || "—"}</dd>
              </div>
              {viewStudent.digitalId && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Digital ID</dt>
                  <dd className="mt-0.5">
                    <a
                      href={viewStudent.digitalId}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      View file
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Parent Details</h3>
              {parentEntries.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No parent details on file.</p>
              ) : (
                <dl className="mt-2 space-y-3 text-sm">
                  {parentEntries.map(([label, info]) => (
                    <div key={label}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-gray-800">
                        {info?.name}
                        {info?.mobile ? ` · ${info.mobile}` : ""}
                        {info?.occupation ? ` · ${info.occupation}` : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Student Login</h3>
              <p className="mt-2 text-sm text-gray-800">{viewStudent.loginEmail || "—"}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

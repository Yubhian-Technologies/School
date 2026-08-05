"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Award,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Home,
  Medal,
  Pencil,
  Plus,
  Star,
  Trash2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import {
  createAchievement,
  deleteAchievement,
  getCurrentAcademicYear,
  getCurrentTerm,
  subscribeToAchievementsForSection,
  updateAchievement,
} from "@/lib/achievements";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import { subscribeToStudentsForClass } from "@/lib/students";
import type { Achievement, ClassSection, Student } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";
const disabledInputClass = `${inputClass} bg-gray-50 text-gray-500`;

const PAGE_SIZE = 8;

interface AchievementFormState {
  studentId: string;
  title: string;
  description: string;
}

const emptyForm: AchievementFormState = { studentId: "", title: "", description: "" };

function StatCard({
  icon: Icon,
  accentIcon: AccentIcon,
  label,
  value,
  caption,
  theme,
}: {
  icon: LucideIcon;
  accentIcon: LucideIcon;
  label: string;
  value: number;
  caption: string;
  theme: "indigo" | "amber";
}) {
  const themes = {
    indigo: {
      card: "border-indigo-100 bg-indigo-50/60",
      iconBg: "bg-indigo-600 text-white",
      accent: "text-indigo-200",
    },
    amber: {
      card: "border-amber-100 bg-amber-50/60",
      iconBg: "bg-amber-500 text-white",
      accent: "text-amber-200",
    },
  }[theme];

  return (
    <div className={`rounded-2xl border p-6 ${themes.card}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${themes.iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{caption}</p>
          </div>
        </div>
        <AccentIcon className={`h-9 w-9 ${themes.accent}`} />
      </div>
    </div>
  );
}

function HighlightItem({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-gray-900">{value}</p>
        <p className="truncate text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function ClassAchievementsPage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [form, setForm] = useState<AchievementFormState>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [viewAchievement, setViewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToStudentsForClass(schoolId, mySection.id, setStudents);
  }, [schoolId, mySection]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToAchievementsForSection(schoolId, mySection.id, setAchievements);
  }, [schoolId, mySection]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    (students ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const sortedStudents = useMemo(
    () => [...(students ?? [])].sort((a, b) => a.rollNo.localeCompare(b.rollNo)),
    [students]
  );

  // Active = currently visible (not soft-deleted) — drives the table and
  // every Section Highlights metric, so a delete updates these immediately.
  const activeAchievements = useMemo(
    () => (achievements ?? []).filter((a) => !a.isDeleted),
    [achievements]
  );

  // Historical = every record ever created (soft-deleted or not), scoped to
  // the current academic year / term — these two counts never decrease when
  // something is deleted, only reset when the year/term itself rolls over.
  const academicYear = getCurrentAcademicYear();
  const term = getCurrentTerm();

  const totalAchievements = useMemo(
    () => (achievements ?? []).filter((a) => a.academicYear === academicYear).length,
    [achievements, academicYear]
  );

  const achievementsThisTerm = useMemo(
    () => (achievements ?? []).filter((a) => a.academicYear === academicYear && a.term === term).length,
    [achievements, academicYear, term]
  );

  const studentsRecognized = useMemo(
    () => new Set(activeAchievements.map((a) => a.studentId)).size,
    [activeAchievements]
  );

  const latestAchievementTitle = useMemo(() => {
    if (activeAchievements.length === 0) return null;
    const sorted = [...activeAchievements].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.date.localeCompare(a.date)
    );
    return sorted[0].title;
  }, [activeAchievements]);

  const currentMonthYear = useMemo(
    () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    []
  );

  const totalPages = Math.max(1, Math.ceil(activeAchievements.length / PAGE_SIZE));
  // Clamp on read rather than syncing `page` back down via an effect — the
  // list shrinking (e.g. after a delete) should never leave the user on a
  // now-empty page, but there's no need for that correction to itself be
  // stored state.
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = activeAchievements.slice(pageStart, pageStart + PAGE_SIZE);

  const isEditing = editingAchievement !== null;

  function updateField<K extends keyof AchievementFormState>(key: K, value: AchievementFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
    setEditingAchievement(null);
  }

  function openAddModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(a: Achievement) {
    setForm({ studentId: a.studentId, title: a.title, description: a.description ?? "" });
    setPhotoFile(null);
    setPhotoPreview(a.photoUrl ?? null);
    setError(null);
    setEditingAchievement(a);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schoolId || !user || !mySection) {
      setError("No class is assigned to this account yet.");
      return;
    }
    if (!isEditing && !form.studentId) {
      setError("Select a student.");
      return;
    }
    if (!form.title.trim()) {
      setError("Enter an achievement title.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingAchievement) {
        await updateAchievement(schoolId, editingAchievement.id, {
          title: form.title,
          description: form.description,
          photo: photoFile,
        });
      } else {
        await createAchievement({
          schoolId,
          studentId: form.studentId,
          classSectionId: mySection.id,
          title: form.title,
          description: form.description,
          photo: photoFile,
          createdByUid: user.uid,
        });
      }
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Could not ${isEditing ? "update" : "save"} achievement.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(a: Achievement) {
    const student = studentsById.get(a.studentId);
    if (!window.confirm(`Delete the achievement "${a.title}"${student ? ` for ${student.name}` : ""}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(a.id);
    try {
      await deleteAchievement(a.id);
      if (viewAchievement?.id === a.id) setViewAchievement(null);
    } catch {
      window.alert("Could not delete this achievement. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedFormStudent = studentsById.get(form.studentId);

  if (mySection === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (mySection === null) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Achievements</h1>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Achievements</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <Home className="h-3.5 w-3.5" />
            <span className="text-gray-300">|</span>
            <span className="font-medium text-indigo-600">{mySection.className}</span>
            <span>—</span>
            <span className="font-medium text-indigo-600">Section {mySection.sectionName}</span>
            <span>—</span>
            <span>Achievements</span>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Achievement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Trophy}
          accentIcon={BarChart3}
          label="Total Achievements"
          value={totalAchievements}
          caption="This Section"
          theme="indigo"
        />
        <StatCard
          icon={Medal}
          accentIcon={CalendarDays}
          label="Achievements This Term"
          value={achievementsThisTerm}
          caption="Keep it up!"
          theme="amber"
        />
      </div>

      <div className="rounded-2xl border border-l-4 border-gray-200 border-l-indigo-500 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">Section Highlights</h2>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <HighlightItem icon={Users} value={studentsRecognized} label="Students Recognized" />
          <HighlightItem icon={Award} value={activeAchievements.length} label="Achievements in List" />
          <HighlightItem icon={CalendarDays} value={currentMonthYear} label="This Month" />
          <HighlightItem
            icon={Trophy}
            value={latestAchievementTitle ?? "No achievements yet"}
            label="Latest Achievement"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Achievements List</h2>
        </div>

        {achievements === null || students === null ? (
          <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
        ) : activeAchievements.length === 0 ? (
          <p className="p-16 text-center text-sm text-gray-500">
            No achievements yet — add one to get started.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Roll No</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Class</th>
                    <th className="px-6 py-3">Section</th>
                    <th className="px-6 py-3">Achievement</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageItems.map((a) => {
                    const student = studentsById.get(a.studentId);
                    return (
                      <tr key={a.id}>
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            {student?.rollNo ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">{student?.name ?? "—"}</td>
                        <td className="px-6 py-3 text-gray-600">{student?.className ?? mySection.className}</td>
                        <td className="px-6 py-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {student?.sectionName ?? mySection.sectionName}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                              <Star className="h-3 w-3" />
                            </span>
                            {a.title}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setViewAchievement(a)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button
                              onClick={() => openEditModal(a)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(a)}
                              disabled={deletingId === a.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {deletingId === a.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500">
              <p>
                Showing {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, activeAchievements.length)} of{" "}
                {activeAchievements.length} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={isEditing ? "Edit Achievement" : "Add Achievement"}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Student Details</h3>
              {isEditing ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Roll No</label>
                    <input disabled value={selectedFormStudent?.rollNo ?? ""} className={disabledInputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Name</label>
                    <input disabled value={selectedFormStudent?.name ?? ""} className={disabledInputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Class</label>
                    <input disabled value={mySection.className} className={disabledInputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Section</label>
                    <input disabled value={mySection.sectionName} className={disabledInputClass} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="achievement-student" className={labelClass}>
                      Student
                    </label>
                    <select
                      id="achievement-student"
                      required
                      value={form.studentId}
                      onChange={(e) => updateField("studentId", e.target.value)}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a student
                      </option>
                      {sortedStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.rollNo} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Class</label>
                      <input disabled value={mySection.className} className={disabledInputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Section</label>
                      <input disabled value={mySection.sectionName} className={disabledInputClass} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Achievement Details</h3>
              <div>
                <label htmlFor="achievement-title" className={labelClass}>
                  Achievement Title
                </label>
                <input
                  id="achievement-title"
                  required
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="achievement-description" className={labelClass}>
                  Achievement Description
                </label>
                <textarea
                  id="achievement-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="achievement-photo" className={labelClass}>
                  Achievement Photo <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt="Achievement preview"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                      No photo
                    </div>
                  )}
                  <input
                    id="achievement-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-sm text-gray-600"
                  />
                </div>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Saving…" : isEditing ? "Update Achievement" : "Save Achievement"}
            </button>
          </form>
        </Modal>
      )}

      {viewAchievement && (
        <Modal
          title="Achievement Details"
          onClose={() => setViewAchievement(null)}
        >
          {(() => {
            const student = studentsById.get(viewAchievement.studentId);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {viewAchievement.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewAchievement.photoUrl}
                      alt={viewAchievement.title}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                      No photo
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-gray-900">{viewAchievement.title}</p>
                    <p className="text-sm text-gray-500">{student?.name ?? "—"}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {[
                    ["Student Name", student?.name || "—"],
                    ["Roll No", student?.rollNo || "—"],
                    ["Class", student?.className ?? mySection.className],
                    ["Section", student?.sectionName ?? mySection.sectionName],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                      <dd className="mt-0.5 text-gray-800">{value}</dd>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Achievement Description
                    </dt>
                    <dd className="mt-0.5 text-gray-800">{viewAchievement.description || "—"}</dd>
                  </div>
                </dl>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

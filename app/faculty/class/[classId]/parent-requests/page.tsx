"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MoreVertical,
  Paperclip,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { subscribeToClassSectionForTeacher } from "@/lib/classSections";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
  addParentRequestReply,
  subscribeToParentRequestReplies,
  subscribeToParentRequestsForSection,
  updateParentRequestStatus,
  uploadRequestAttachment,
} from "@/lib/parentRequests";
import type {
  ClassSection,
  ParentRequest,
  ParentRequestReply,
  ParentRequestStatus,
  ParentRequestType,
} from "@/lib/types";

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const STATUS_STYLES: Record<ParentRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}, ${d.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit", hour12: true }
  )}`;
}

function isToday(ms: number | null): boolean {
  if (!ms) return false;
  const d = new Date(ms);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

function StatusBadge({ status }: { status: ParentRequestStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
}

function TopStat({ icon: Icon, iconBg, value, label }: { icon: LucideIcon; iconBg: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
  caption,
  theme,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  caption: string;
  theme: "violet" | "green" | "teal";
}) {
  const themes = {
    violet: { card: "bg-violet-50 border-violet-100", icon: "bg-violet-500 text-white" },
    green: { card: "bg-emerald-50 border-emerald-100", icon: "bg-emerald-500 text-white" },
    teal: { card: "bg-teal-50 border-teal-100", icon: "bg-teal-500 text-white" },
  }[theme];
  return (
    <div className={`rounded-2xl border p-5 ${themes.card}`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${themes.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">{caption}</p>
        </div>
      </div>
    </div>
  );
}

export default function ClassParentRequestsPage() {
  const { profile, user } = useAuth();
  const schoolId = profile?.schoolId ?? null;

  const [mySection, setMySection] = useState<ClassSection | null | undefined>(undefined);
  const [requests, setRequests] = useState<ParentRequest[] | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ParentRequestStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ParentRequestType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<ParentRequestReply[] | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ParentRequestStatus>("pending");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!schoolId || !user) return;
    return subscribeToClassSectionForTeacher(schoolId, user.uid, setMySection);
  }, [schoolId, user]);

  useEffect(() => {
    if (!schoolId || !mySection) return;
    return subscribeToParentRequestsForSection(schoolId, mySection.id, setRequests);
  }, [schoolId, mySection]);

  useEffect(() => {
    if (!selectedId) return;
    return subscribeToParentRequestReplies(selectedId, setReplies);
  }, [selectedId]);

  const selectedRequest = useMemo(
    () => (requests ?? []).find((r) => r.id === selectedId) ?? null,
    [requests, selectedId]
  );

  // Stable REQ-#### numbering derived from creation order (oldest = 1001),
  // recomputed from whatever's currently loaded — not stored, purely display.
  const requestNumber = useMemo(() => {
    const ascending = [...(requests ?? [])].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const map = new Map<string, number>();
    ascending.forEach((r, i) => map.set(r.id, 1001 + i));
    return map;
  }, [requests]);

  const totalRequests = requests?.length ?? 0;
  const pendingCount = useMemo(() => (requests ?? []).filter((r) => r.status === "pending").length, [requests]);
  const inProgressCount = useMemo(
    () => (requests ?? []).filter((r) => r.status === "in_progress").length,
    [requests]
  );
  const resolvedTodayCount = useMemo(
    () => (requests ?? []).filter((r) => r.status === "resolved" && isToday(r.updatedAt)).length,
    [requests]
  );
  const meetingCount = useMemo(() => (requests ?? []).filter((r) => r.type === "MEETING").length, [requests]);

  const filteredSorted = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = (requests ?? []).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (dateFrom && (!r.createdAt || r.createdAt < new Date(dateFrom).getTime())) return false;
      if (dateTo && (!r.createdAt || r.createdAt > new Date(dateTo).getTime() + 86_400_000 - 1)) return false;
      if (!term) return true;
      return (
        r.parentName.toLowerCase().includes(term) ||
        r.studentName.toLowerCase().includes(term) ||
        r.admissionNo.toLowerCase().includes(term) ||
        r.rollNo.toLowerCase().includes(term) ||
        r.subject.toLowerCase().includes(term) ||
        `req-${requestNumber.get(r.id)}`.includes(term)
      );
    });
    list = [...list].sort((a, b) =>
      sortBy === "newest" ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : (a.createdAt ?? 0) - (b.createdAt ?? 0)
    );
    return list;
  }, [requests, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, sortBy, requestNumber]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageItems = filteredSorted.slice(pageStart, pageStart + rowsPerPage);

  function openRequest(r: ParentRequest) {
    setSelectedId(r.id);
    setStatusDraft(r.status);
    setReplies(null);
    setOpenMenuId(null);
    setReplyText("");
    setReplyFiles([]);
  }

  async function handleQuickStatus(r: ParentRequest, status: ParentRequestStatus) {
    if (!user || !profile) return;
    setOpenMenuId(null);
    await updateParentRequestStatus(r.id, status, { uid: user.uid, name: profile.name || "Class Teacher" });
  }

  function handleReplyFileChange(e: ChangeEvent<HTMLInputElement>) {
    setReplyFiles(Array.from(e.target.files ?? []));
  }

  async function handleSendReply(e: FormEvent) {
    e.preventDefault();
    if (!user || !profile || !selectedRequest || !schoolId) return;
    if (!replyText.trim() && replyFiles.length === 0) return;

    setSendingReply(true);
    try {
      const uploaded = [];
      for (const file of replyFiles) {
        uploaded.push(await uploadRequestAttachment(schoolId, file));
      }
      const attachmentNote = uploaded.length
        ? `\n${uploaded.map((f) => `📎 ${f.name} (${f.url})`).join("\n")}`
        : "";
      await addParentRequestReply(selectedRequest.id, {
        senderUid: user.uid,
        senderName: profile.name || "Class Teacher",
        senderRole: "faculty",
        text: `${replyText.trim()}${attachmentNote}`,
      });
      setReplyText("");
      setReplyFiles([]);
    } finally {
      setSendingReply(false);
    }
  }

  async function handleUpdateStatus() {
    if (!user || !profile || !selectedRequest) return;
    setUpdatingStatus(true);
    try {
      await updateParentRequestStatus(selectedRequest.id, statusDraft, {
        uid: user.uid,
        name: profile.name || "Class Teacher",
      });
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (mySection === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (mySection === null) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Parent Requests</h1>
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
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Parent Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              View, manage, and respond to requests submitted by parents of students in your class.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TopStat icon={Mail} iconBg="bg-sky-100 text-sky-600" value={totalRequests} label="Total Requests" />
            <TopStat icon={Clock} iconBg="bg-amber-100 text-amber-600" value={pendingCount} label="Pending" />
            <TopStat icon={Loader2} iconBg="bg-indigo-100 text-indigo-600" value={inProgressCount} label="In Progress" />
            <TopStat
              icon={CheckCircle2}
              iconBg="bg-emerald-100 text-emerald-600"
              value={resolvedTodayCount}
              label="Resolved Today"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={Users}
            value={pendingCount}
            label="Pending Requests"
            caption="Requests waiting for reply"
            theme="violet"
          />
          <SummaryCard
            icon={Clock}
            value={meetingCount}
            label="Meeting Requests"
            caption="Parent meeting requests"
            theme="green"
          />
          <SummaryCard
            icon={CheckCircle2}
            value={resolvedTodayCount}
            label="Resolved Today"
            caption="Successfully resolved"
            theme="teal"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Parent / Student / ID / Roll No / Subject"
                className={`${inputClass} w-full pl-9`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="all">All Statuses</option>
              {(Object.keys(REQUEST_STATUS_LABEL) as ParentRequestStatus[]).map((s) => (
                <option key={s} value={s}>
                  {REQUEST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as typeof typeFilter);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="all">All Types</option>
              {(Object.keys(REQUEST_TYPE_LABEL) as ParentRequestType[]).map((t) => (
                <option key={t} value={t}>
                  {REQUEST_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
                aria-label="From date"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
                aria-label="To date"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className={inputClass}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {requests === null ? (
            <p className="p-16 text-center text-sm text-gray-500">Loading…</p>
          ) : filteredSorted.length === 0 ? (
            <p className="p-16 text-center text-sm text-gray-500">No requests found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Request ID</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Admission ID</th>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Parent Name</th>
                      <th className="px-4 py-3">Request Type</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted On</th>
                      <th className="px-4 py-3">Last Updated</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageItems.map((r) => (
                      <tr key={r.id} className={selectedId === r.id ? "bg-indigo-50/40" : undefined}>
                        <td className="px-4 py-3 font-semibold text-gray-900">REQ-{requestNumber.get(r.id)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                              {initialOf(r.studentName)}
                            </span>
                            <span className="text-gray-800">{r.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.admissionNo}</td>
                        <td className="px-4 py-3 text-gray-600">{r.rollNo}</td>
                        <td className="px-4 py-3 text-gray-600">{r.parentName}</td>
                        <td className="px-4 py-3 text-gray-600">{REQUEST_TYPE_LABEL[r.type]}</td>
                        <td className="px-4 py-3 text-gray-600">{r.subject}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(r.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => openRequest(r)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuId === r.id && (
                              <div className="absolute right-0 top-9 z-10 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                {(Object.keys(REQUEST_STATUS_LABEL) as ParentRequestStatus[]).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleQuickStatus(r, s)}
                                    disabled={r.status === s}
                                    className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:text-gray-300"
                                  >
                                    Mark {REQUEST_STATUS_LABEL[s]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>
                    Showing {pageStart + 1} to {Math.min(pageStart + rowsPerPage, filteredSorted.length)} of{" "}
                    {filteredSorted.length} requests
                  </span>
                  <span className="ml-3 flex items-center gap-1.5">
                    Rows per page
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      {ROWS_PER_PAGE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
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
                  <span className="text-xs text-gray-400">of {totalPages}</span>
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
      </div>

      {selectedRequest && (
        <Modal
          title="View Request"
          onClose={() => setSelectedId(null)}
          maxWidthClassName="max-w-none"
          maxHeightClassName="h-full max-h-full"
          overlayPaddingClassName="p-0"
          dialogDecorationClassName=""
          overlayPositionClassName="inset-y-0 left-64 right-0"
        >
          <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-900">REQ-{requestNumber.get(selectedRequest.id)}</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600">{REQUEST_TYPE_LABEL[selectedRequest.type]}</span>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Parent Information</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Parent Name</p>
                    <p className="font-medium text-gray-800">{selectedRequest.parentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Relationship</p>
                    <p className="font-medium text-gray-800">{selectedRequest.parentRelation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-medium text-gray-800">{selectedRequest.parentPhone || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-medium text-gray-800">{selectedRequest.parentEmail || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Student Information</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Student Name</p>
                    <p className="font-medium text-gray-800">{selectedRequest.studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Admission ID</p>
                    <p className="font-medium text-gray-800">{selectedRequest.admissionNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Roll No</p>
                    <p className="font-medium text-gray-800">{selectedRequest.rollNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Class</p>
                    <p className="font-medium text-gray-800">
                      {selectedRequest.className} · {selectedRequest.sectionName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Request Information</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Request Type</p>
                    <p className="font-medium text-gray-800">{REQUEST_TYPE_LABEL[selectedRequest.type]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Subject</p>
                    <p className="font-medium text-gray-800">{selectedRequest.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Submitted On</p>
                    <p className="font-medium text-gray-800">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-400">Description</p>
                  <p className="mt-0.5 text-sm text-gray-800">{selectedRequest.description}</p>
                </div>
                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400">Attachments</p>
                    <div className="mt-1 space-y-1">
                      {selectedRequest.attachments.map((att) => (
                        <a
                          key={att.url}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5" /> {att.name}
                          </span>
                          <span className="text-gray-400">{Math.round(att.size / 1024)} KB</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conversation Timeline</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                      {initialOf(selectedRequest.parentName)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800">
                        {selectedRequest.parentName}{" "}
                        <span className="font-normal text-gray-400">· {formatDateTime(selectedRequest.createdAt)}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-gray-700">{selectedRequest.description}</p>
                    </div>
                  </div>

                  {replies === null ? (
                    <p className="text-xs text-gray-400">Loading conversation…</p>
                  ) : (
                    replies.map((msg) => (
                      <div key={msg.id} className="flex gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            msg.senderRole === "system"
                              ? "bg-gray-100 text-gray-500"
                              : msg.senderRole === "faculty"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {msg.senderRole === "system" ? "⚙" : initialOf(msg.senderName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800">
                            {msg.senderName}{" "}
                            <span className="font-normal text-gray-400">· {formatDateTime(msg.sentAt)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-sm text-gray-700">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={handleSendReply} className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reply to Parent</h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Type your reply..."
                  className={`${inputClass} mt-2 w-full`}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700">
                    <Paperclip className="h-3.5 w-3.5" />
                    {replyFiles.length ? `${replyFiles.length} file(s)` : "Attach File"}
                    <input type="file" multiple onChange={handleReplyFileChange} className="hidden" />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyText("");
                        setReplyFiles([]);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Save Draft
                    </button>
                    <button
                      type="submit"
                      disabled={sendingReply || (!replyText.trim() && replyFiles.length === 0)}
                      className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {sendingReply ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </div>
              </form>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Change Status</h3>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as ParentRequestStatus)}
                    className={`${inputClass} flex-1`}
                  >
                    {(Object.keys(REQUEST_STATUS_LABEL) as ParentRequestStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {REQUEST_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || statusDraft === selectedRequest.status}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {updatingStatus ? "Updating…" : "Update Status"}
                  </button>
                </div>
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
}

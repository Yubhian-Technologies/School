"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Paperclip, Plus } from "lucide-react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
  addParentRequestReply,
  createParentRequest,
  subscribeToParentRequestReplies,
  subscribeToParentRequestsForParent,
} from "@/lib/parentRequests";
import { subscribeToLinkedStudent } from "@/lib/students";
import type { ParentRequest, ParentRequestReply, ParentRequestStatus, ParentRequestType, Student } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700";

const STATUS_STYLES: Record<ParentRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}, ${d.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit", hour12: true }
  )}`;
}

interface RequestFormState {
  type: ParentRequestType;
  relation: "Father" | "Mother" | "Guardian" | "";
  subject: string;
  description: string;
}

const emptyForm: RequestFormState = { type: "ACADEMIC", relation: "", subject: "", description: "" };

export default function ParentRequestsPage() {
  const { profile } = useAuth();

  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [requests, setRequests] = useState<ParentRequest[] | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RequestFormState>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<ParentRequestReply[] | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLinkedStudent(profile.uid, setStudent);
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToParentRequestsForParent(profile.uid, setRequests);
  }, [profile?.uid]);

  useEffect(() => {
    if (!selectedId) return;
    return subscribeToParentRequestReplies(selectedId, setReplies);
  }, [selectedId]);

  const sortedRequests = useMemo(
    () => [...(requests ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [requests]
  );

  const selectedRequest = useMemo(
    () => (requests ?? []).find((r) => r.id === selectedId) ?? null,
    [requests, selectedId]
  );

  function updateField<K extends keyof RequestFormState>(key: K, value: RequestFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openModal() {
    setForm(emptyForm);
    setFiles([]);
    setError(null);
    setModalOpen(true);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!student || !profile?.uid) {
      setError("No student is linked to this account yet.");
      return;
    }
    if (!form.relation) {
      setError("Select your relationship to the student.");
      return;
    }
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Fill in both Subject and Description.");
      return;
    }

    setSubmitting(true);
    try {
      await createParentRequest({
        schoolId: student.schoolId,
        classSectionId: student.classSectionId,
        studentId: student.id,
        studentName: student.name,
        admissionNo: student.admissionNo,
        rollNo: student.rollNo,
        className: student.className ?? "",
        sectionName: student.sectionName ?? "",
        parentUid: profile.uid,
        parentName: profile.name || "Parent",
        parentRelation: form.relation,
        parentPhone: profile.phone,
        parentEmail: profile.email,
        type: form.type,
        subject: form.subject,
        description: form.description,
        attachments: files,
      });
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendReply(e: FormEvent) {
    e.preventDefault();
    if (!profile?.uid || !selectedRequest || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await addParentRequestReply(selectedRequest.id, {
        senderUid: profile.uid,
        senderName: profile.name || "Parent",
        senderRole: "parent",
        text: replyText,
      });
      setReplyText("");
    } finally {
      setSendingReply(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Requests"
        subtitle="Raise a request with your child's Class Teacher and track its status"
        action={
          student ? (
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" /> New Request
            </button>
          ) : undefined
        }
      />

      {student === undefined || (student && requests === null) ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          Loading…
        </p>
      ) : student === null ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No student is linked to this account yet.
        </p>
      ) : sortedRequests.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
          No requests yet — use &quot;New Request&quot; to contact your child&apos;s Class Teacher.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedRequests.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setSelectedId(r.id);
                setReplies(null);
                setReplyText("");
              }}
              className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-indigo-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {REQUEST_TYPE_LABEL[r.type]} <span className="font-normal text-gray-400">· {r.subject}</span>
                </p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>
                  {REQUEST_STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{r.description}</p>
              <p className="mt-2 text-xs text-gray-400">Submitted {formatDateTime(r.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="New Request" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="request-type" className={labelClass}>
                  Request Type
                </label>
                <select
                  id="request-type"
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value as ParentRequestType)}
                  className={inputClass}
                >
                  {(Object.keys(REQUEST_TYPE_LABEL) as ParentRequestType[]).map((t) => (
                    <option key={t} value={t}>
                      {REQUEST_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="request-relation" className={labelClass}>
                  Your Relationship
                </label>
                <select
                  id="request-relation"
                  required
                  value={form.relation}
                  onChange={(e) => updateField("relation", e.target.value as RequestFormState["relation"])}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="request-subject" className={labelClass}>
                Subject
              </label>
              <input
                id="request-subject"
                required
                value={form.subject}
                onChange={(e) => updateField("subject", e.target.value)}
                placeholder="e.g. Mathematics, Fee Payment, Bus Route"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="request-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="request-description"
                required
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="request-attachment" className={labelClass}>
                Attachment <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="request-attachment"
                type="file"
                multiple
                onChange={handleFileChange}
                className="mt-1 text-sm text-gray-600"
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </Modal>
      )}

      {selectedRequest && (
        <Modal title="Request Details" onClose={() => setSelectedId(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-900">{REQUEST_TYPE_LABEL[selectedRequest.type]}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">{selectedRequest.subject}</span>
              <span
                className={`ml-auto inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[selectedRequest.status]}`}
              >
                {REQUEST_STATUS_LABEL[selectedRequest.status]}
              </span>
            </div>

            {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
              <div className="space-y-1">
                {selectedRequest.attachments.map((att) => (
                  <a
                    key={att.url}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> {att.name}
                  </a>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conversation</h3>
              <div className="mt-2 max-h-72 space-y-3 overflow-y-auto">
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
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                placeholder="Type a message…"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {sendingReply ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  ParentRequest,
  ParentRequestAttachment,
  ParentRequestReply,
  ParentRequestStatus,
  ParentRequestType,
} from "./types";

export const REQUEST_TYPE_LABEL: Record<ParentRequestType, string> = {
  LEAVE: "Leave Request",
  ACADEMIC: "Academic",
  ATTENDANCE: "Attendance",
  FEE: "Fee",
  TRANSPORT: "Transport",
  MEETING: "Meeting",
  OTHER: "Other",
};

export const REQUEST_STATUS_LABEL: Record<ParentRequestStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

// Not tied to any particular Firestore doc id — a fresh random path per
// upload, same pattern as uploadAchievementPhoto/uploadAssignmentAttachment.
// Used for both the initial request's attachments and later reply
// attachments, so a request can be created in a single write (see
// createParentRequest below) instead of create-then-update, which the
// owning parent isn't permitted to do (only Admin/Class Teacher can update
// the parentRequests/{id} doc itself — see firestore.rules).
export async function uploadRequestAttachment(
  schoolId: string,
  file: File
): Promise<ParentRequestAttachment> {
  const id = crypto.randomUUID();
  const fileRef = ref(storage, `schools/${schoolId}/parentRequests/${id}/${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return { name: file.name, url, size: file.size };
}

export interface CreateParentRequestInput {
  schoolId: string;
  classSectionId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: string;
  className: string;
  sectionName: string;
  parentUid: string;
  parentName: string;
  parentRelation: string;
  parentPhone?: string;
  parentEmail?: string;
  type: ParentRequestType;
  subject: string;
  description: string;
  attachments: File[];
}

export async function createParentRequest(input: CreateParentRequestInput): Promise<string> {
  const attachments: ParentRequestAttachment[] = [];
  for (const file of input.attachments) {
    attachments.push(await uploadRequestAttachment(input.schoolId, file));
  }

  const docRef = await addDoc(collection(db, "parentRequests"), {
    schoolId: input.schoolId,
    classSectionId: input.classSectionId,
    studentId: input.studentId,
    studentName: input.studentName,
    admissionNo: input.admissionNo,
    rollNo: input.rollNo,
    className: input.className,
    sectionName: input.sectionName,
    parentUid: input.parentUid,
    parentName: input.parentName,
    parentRelation: input.parentRelation,
    ...(input.parentPhone ? { parentPhone: input.parentPhone } : {}),
    ...(input.parentEmail ? { parentEmail: input.parentEmail } : {}),
    type: input.type,
    subject: input.subject.trim(),
    description: input.description.trim(),
    status: "pending",
    ...(attachments.length ? { attachments } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// Admin/Class Teacher only (firestore.rules) — also drops a "system" entry
// into the reply thread so the Conversation Timeline shows the change, the
// same way the mockup's "Status changed from New to Pending" line does.
export async function updateParentRequestStatus(
  requestId: string,
  newStatus: ParentRequestStatus,
  actor: { uid: string; name: string }
) {
  await updateDoc(doc(db, "parentRequests", requestId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
  await addParentRequestReply(requestId, {
    senderUid: actor.uid,
    senderName: "System",
    senderRole: "system",
    text: `${actor.name} changed the status to ${REQUEST_STATUS_LABEL[newStatus]}.`,
  });
}

export interface AddReplyInput {
  senderUid: string;
  senderName: string;
  senderRole: ParentRequestReply["senderRole"];
  text: string;
}

export async function addParentRequestReply(requestId: string, input: AddReplyInput) {
  await addDoc(collection(db, "parentRequests", requestId, "replies"), {
    senderUid: input.senderUid,
    senderName: input.senderName,
    senderRole: input.senderRole,
    text: input.text.trim(),
    sentAt: serverTimestamp(),
  });
}

function mapRequestDoc(docSnap: QueryDocumentSnapshot): ParentRequest {
  const data = docSnap.data() as Omit<ParentRequest, "id" | "createdAt" | "updatedAt"> & {
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
  };
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
  };
}

// Class Teacher's table — scoped by classSectionId (equality-filtered) to
// match parentRequests' isParentReviewedRequestCollection read rule branch
// isClassTeacherOf(resource.data.classSectionId).
export function subscribeToParentRequestsForSection(
  schoolId: string,
  classSectionId: string,
  callback: (requests: ParentRequest[]) => void
) {
  const q = query(
    collection(db, "parentRequests"),
    where("schoolId", "==", schoolId),
    where("classSectionId", "==", classSectionId)
  );
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(mapRequestDoc).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    callback(requests);
  });
}

// Parent's own list — scoped by parentUid (equality-filtered) to match the
// rule's `request.auth.uid == resource.data.parentUid` read branch.
export function subscribeToParentRequestsForParent(
  parentUid: string,
  callback: (requests: ParentRequest[]) => void
) {
  const q = query(collection(db, "parentRequests"), where("parentUid", "==", parentUid));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(mapRequestDoc).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    callback(requests);
  });
}

function mapReplyDoc(docSnap: QueryDocumentSnapshot): ParentRequestReply {
  const data = docSnap.data() as Omit<ParentRequestReply, "id" | "sentAt"> & { sentAt: Timestamp | null };
  return { ...data, id: docSnap.id, sentAt: data.sentAt ? data.sentAt.toMillis() : null };
}

export function subscribeToParentRequestReplies(
  requestId: string,
  callback: (replies: ParentRequestReply[]) => void
) {
  const q = query(collection(db, "parentRequests", requestId, "replies"), orderBy("sentAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(mapReplyDoc));
  });
}

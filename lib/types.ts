export type Role = "superadmin" | "admin" | "faculty" | "parent";

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  schoolId: string | null;
  status: string;
  name?: string;
  phone?: string;
}

export interface School {
  id: string;
  name: string;
  place: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Timetable (Admin grid-editor module — app/admin/timetable, lib/timetable*.ts)
// NOTE: separate from the Timetable/TimetablePeriod spec below (Excel-upload
// based, docs/context.md Tab 3) — these haven't been reconciled yet.
//
// Every class section owns a fully independent timetable — no shared
// school-wide config. Clicking "Create Timetable" instantly generates a
// default structure (Mon-Sat columns, Period 1-8 rows, a Lunch Break after
// Period 4) rather than asking the admin to build the grid by hand; Edit
// Structure lets them customize it afterward. Stored one document per
// section in the timetableGrids collection, keyed by the real
// classSections/{id} doc id (see ClassSection below) — this is also what
// Student.classSectionId, FacultyAssignment.classSectionId, and
// classSectionRoles reference, so a timetable can always be found from
// existing relationships without a separate mapping.
//
// Columns = working days, rows = periods (matches a real school timetable:
// day names across the top, periods listed down the side). Breaks are a
// separate list, not a row/period flag — each renders as a full-width banner
// positioned right after a given period (or before Period 1).
// ---------------------------------------------------------------------------

export type SectionTimetableStatus = "draft" | "published";

export interface TimetableDayDef {
  id: string;
  label: string;
  order: number;
}

export interface TimetablePeriodDef {
  id: string;
  label: string;
  order: number;
  // "HH:mm" (24-hour), admin-entered per period — optional so existing
  // periods created before this field existed still render fine.
  startTime: string | null;
  endTime: string | null;
}

export interface TimetableBreakDef {
  id: string;
  label: string;
  durationMinutes: number;
  // Renders immediately after this period; null = before Period 1.
  afterPeriodId: string | null;
}

export interface TimetableCellData {
  subject: string;
  facultyId: string | null;
  // Denormalized at write time so rendering the grid doesn't need a read per
  // faculty reference.
  facultyName: string | null;
  room: string;
  notes: string;
}

export interface SectionTimetable {
  id: string; // == sectionId
  schoolId: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  name: string;
  effectiveDate: string;
  status: SectionTimetableStatus;
  days: TimetableDayDef[];
  periods: TimetablePeriodDef[];
  breaks: TimetableBreakDef[];
  // Keyed by `${dayId}_${periodId}`.
  cells: Record<string, TimetableCellData>;
  createdAt: number | null;
  updatedAt: number | null;
}

// ---------------------------------------------------------------------------
// Faculty (Admin "Add Faculty" module — app/admin/faculty, lib/faculty.ts)
// ---------------------------------------------------------------------------

export interface Faculty {
  uid: string;
  facultyId: string;
  schoolId: string;
  name: string;
  gender: "Male" | "Female";
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
  photoURL: string | null;
  status: "Active" | "Inactive";
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Faculty (richer schema for classSectionRoles-based permissions — not yet
// wired to any UI/lib code; reconcile with Faculty above before building
// Class/Subject Teacher dashboards, see CLAUDE.md)
// ---------------------------------------------------------------------------

export type FacultyClassRole = "CLASS_TEACHER" | "SUBJECT_TEACHER";

export interface FacultyProfile {
  uid: string; // == auth uid == users/{uid} id
  schoolId: string;
  employeeId: string;
  name: string;
  gender?: string;
  dob?: string;
  mobile: string;
  email: string;
  qualification?: string;
  department?: string; // soft metadata only, not used for access control
  subjectsAssigned: string[];
  designation?: string;
  dateOfJoining?: string;
  experience?: string;
  address?: string;
  emergencyContact?: string;
  photoUrl?: string;
  status: "active" | "inactive";
  /** Denormalized for Firestore rules: one get() to resolve this faculty's role on a given class-section. */
  classSectionRoles: Record<string, FacultyClassRole>;
}

export interface FacultyAssignment {
  id: string; // == `${classSectionId}_${subjectId}` for SUBJECT_TEACHER assignments
  schoolId: string;
  facultyUid: string;
  facultyName?: string;
  classSectionId: string;
  className?: string;
  sectionName?: string;
  role: FacultyClassRole;
  subjectId?: string;
  subjectName?: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Classes / Sections
// ---------------------------------------------------------------------------

export interface ClassSection {
  id: string;
  schoolId: string;
  academicYear: string;
  className: string; // "Nursery" | "LKG" | "UKG" | "Class 1" ... "Class 10"
  sectionName: string; // "A" | "B" | "C" ...
  classTeacherUid: string | null;
  /** Planned seats for this section — a capacity figure the Admin sets, not a live enrollment count. */
  studentIntake?: number;
}

export type SubjectType = "Theory" | "Practical" | "Activity";

/** A subject offered for a class — shared across every section of that
 * class (not section-specific), matching how a school's academic plan
 * actually works: all of Class 5-A/B/C study the same subject list. */
export interface Subject {
  id: string;
  schoolId: string;
  className: string; // "Nursery" | "LKG" | "UKG" | "Class 1" ... "Class 10"
  name: string;
  code?: string;
  type: SubjectType;
  hoursPerWeek?: number;
  createdAt: number | null;
}

/** parentClassLinks/{parentUid}_{classSectionId} — existence-only marker doc used by rules
 * to authorize a parent's read of class-scoped (not student-scoped) collections. */
export interface ParentClassLink {
  parentUid: string;
  classSectionId: string;
  schoolId: string;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export interface MedicalInfo {
  history?: string;
  allergies?: string;
  existingDiseases?: string;
  currentMedication?: string;
  emergencyNotes?: string;
}

export interface AddressInfo {
  current?: string;
  permanent?: string;
  city?: string;
  state?: string;
  pinCode?: string;
}

export interface ParentInfo {
  name?: string;
  aadhaarNo?: string;
  occupation?: string;
  qualification?: string;
  mobile?: string;
  altMobile?: string;
  email?: string;
}

export interface GuardianInfo {
  name?: string;
  relation?: string;
  mobile?: string;
  address?: string;
  aadhaarNo?: string;
  email?: string;
  occupation?: string;
}

export interface TransportInfo {
  required: boolean;
  busId?: string;
  busNumber?: string;
  route?: string;
  boardingPoint?: string;
  feePaid?: boolean;
}

export interface Student {
  id: string;
  schoolId: string;
  classSectionId: string;
  academicYear: string;
  /** Human-readable class/section text, denormalized from the classSections
   * doc (lib/classSections.ts) at the time the class teacher was resolved —
   * classSectionId is still the id that drives access rules/queries. */
  className?: string;
  sectionName?: string;

  photoUrl?: string;
  admissionNo: string;
  rollNo: string;
  /** URL of an uploaded Digital ID document (photo or PDF), not a generated code. */
  digitalId?: string;
  name: string;
  admissionDate?: string;
  dob?: string;
  gender?: string;
  aadhaarNo?: string;
  bloodGroup?: string;
  religion?: string;
  category?: string;
  nationality?: string;
  previousSchool?: string;

  house?: string;
  medium?: string;
  secondLanguage?: string;
  optionalSubject?: string;

  medical?: MedicalInfo;
  address?: AddressInfo;

  father?: ParentInfo;
  mother?: ParentInfo;
  guardian?: GuardianInfo;
  /** Auth uids of parents/guardians linked to this student — the sole parent -> student link. */
  guardianUids: string[];
  /** The single "Student Login" email (used by whichever parent signs in) — denormalized here so it can be shown when viewing this student, without a separate users/{uid} read. */
  loginEmail?: string;

  transport?: TransportInfo;

  status: "active" | "inactive" | "transferred";
  createdByUid: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

// Morning and Afternoon attendance are taken (and saved) as two independent
// events — a teacher may submit Morning at the start of the day and
// Afternoon only later — so each half of the day is its own immutable
// record/summary, keyed by session, rather than one combined per-day doc
// that would need to be updated later (which firestore.rules deliberately
// never allows — see the "one submission per class per day" note below).
export type AttendanceSession = "MORNING" | "AFTERNOON";

export interface AttendanceRecord {
  id: string; // `${studentId}_${date}_${session}`
  schoolId: string;
  classSectionId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  session: AttendanceSession;
  present: boolean;
  remark?: string;
  markedByUid: string;
}

// attendanceSummaries/{classSectionId}_{date}_{session} — one immutable doc
// per class, per calendar date, per session, written atomically alongside
// that session's attendance/{studentId}_{date}_{session} docs in a single
// writeBatch (see lib/attendance.ts submitSessionAttendance). Exists so the
// Dashboard/History can answer "has this session been taken?" and list past
// dates without reading every student's individual record, and so
// firestore.rules has a single doc to make immutable as the "one submission
// per class per day per session" lock. Never read by parents — their own
// summary is computed client-side from their child's own attendance/{id}
// docs only.
export interface AttendanceSummary {
  id: string; // `${classSectionId}_${date}_${session}`
  schoolId: string;
  classSectionId: string;
  date: string; // YYYY-MM-DD
  session: AttendanceSession;
  teacherUid: string;
  submittedAt: number | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
}

export type HolidayType = "FULL_DAY" | "HALF_DAY";

// holidays/{schoolId}_{date} — declared by the Admin (public holidays,
// vacations, sudden/emergency closures), for the WHOLE SCHOOL — every
// class-section, not just one. Supersedes an earlier per-class-teacher
// design: holiday declarations are school-wide policy, not something an
// individual Class Teacher should own. FULL_DAY cancels both Morning and
// Afternoon attendance for that date; HALF_DAY cancels only
// `cancelledSession`. Every Sunday is treated as a holiday by default at the
// application level (see lib/holidays.ts's isDefaultHoliday) without needing
// a stored document for each one — a doc here is only for exceptions
// (declared public holidays, vacations, emergency closures) or for
// overriding a default (e.g. a working Sunday).
export interface Holiday {
  id: string; // `${schoolId}_${date}`
  schoolId: string;
  date: string; // YYYY-MM-DD
  type: HolidayType;
  cancelledSession?: AttendanceSession; // required iff type === "HALF_DAY"
  reason: string;
  createdByUid: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Assignments / Achievements / Assessments
// ---------------------------------------------------------------------------

export interface Assignment {
  id: string; // == `${classSectionId}_${subjectId}_${date}` — one diary entry per class-section+subject+day
  schoolId: string;
  classSectionId: string;
  className?: string;
  sectionName?: string;
  subjectId: string;
  subjectName: string;
  facultyUid: string;
  date: string; // YYYY-MM-DD
  classwork?: string;
  homework?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  dueDate?: string;
  updatedAt: number | null;
}

// Soft-deleted (never removed from Firestore) so historical stats — Total
// Achievements / Achievements This Term on the Class Teacher dashboard — can
// keep counting a record after it's "deleted" from the active list. Active
// views (the Achievements table, Section Highlights, the Parent dashboard)
// all filter on isDeleted == false; only the two historical cards read the
// full, unfiltered set. academicYear/term are stamped at creation time
// (lib/achievements.ts's getCurrentTerm/getCurrentAcademicYear) so a record's
// historical bucket never shifts retroactively as the calendar moves on.
export interface Achievement {
  id: string;
  schoolId: string;
  studentId: string;
  classSectionId: string;
  title: string;
  description?: string;
  category?: string;
  competitionName?: string;
  date: string;
  photoUrl?: string;
  certificateUrl?: string;
  createdByUid: string;
  academicYear: string;
  term: string;
  isDeleted: boolean;
  deletedAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
}

// "Assessments" — Subject Teacher conducted quizzes/competitions (Faculty
// Subject Teacher module + Parent "Assessments" page). Class-scoped like
// Assignment (not per-student) — a quiz/competition announcement for the
// whole class-section, not an individual mark entry. See AcademicRecord
// below for the separate, per-student "Academics"/exam-marks concept.
export type AssessmentType = "QUIZ" | "COMPETITION" | "TEST" | "OTHER";

export interface Assessment {
  id: string; // `${classSectionId}_${subjectId}_${date}` (mirrors Assignment)
  schoolId: string;
  classSectionId: string;
  className?: string;
  sectionName?: string;
  subjectId: string;
  subjectName?: string;
  facultyUid: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: AssessmentType;
  description?: string;
  updatedAt: number | null;
}

// "Academics" — formal exam marks per student per subject (Parent
// "Academics" page), entered by the Subject Teacher of that subject. Kept
// separate from Assessment above since exam marks are per-student, not a
// class-wide announcement.
export interface AcademicRecord {
  id: string; // `${studentId}_${subjectId}_${examName}`
  schoolId: string;
  classSectionId: string;
  studentId: string;
  subjectId: string;
  subjectName?: string;
  examName: string; // e.g. "Unit Test 1", "Half Yearly"
  marksObtained: number;
  totalMarks: number;
  grade?: string;
  remarks?: string;
  enteredByUid: string;
  updatedAt: number | null;
}

// ---------------------------------------------------------------------------
// Parent Requests / Leave Requests
// ---------------------------------------------------------------------------

export type RequestStatus = "pending" | "approved" | "rejected";

// ParentRequest — a general help-desk ticket a parent raises against their
// child's Class Teacher (Leave/Academic/Attendance/Fee/Transport/Meeting/
// Other), reviewed and responded to via a per-request reply thread. Distinct
// from LeaveRequest below (a separate, purpose-built module/collection —
// this "LEAVE" type value is just a category label here, not wired to it).
// Uses its own status enum (not RequestStatus above, which LeaveRequest
// still owns) since the review workflow here is Pending -> In Progress ->
// Resolved, not an approve/reject decision.
export type ParentRequestType =
  | "LEAVE"
  | "ACADEMIC"
  | "ATTENDANCE"
  | "FEE"
  | "TRANSPORT"
  | "MEETING"
  | "OTHER";

export type ParentRequestStatus = "pending" | "in_progress" | "resolved";

export interface ParentRequestAttachment {
  name: string;
  url: string;
  size: number;
}

export interface ParentRequest {
  id: string;
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
  status: ParentRequestStatus;
  attachments?: ParentRequestAttachment[];
  reviewedByUid?: string;
  createdAt: number | null;
  updatedAt: number | null;
}

// parentRequests/{id}/replies/{replyId} — the "Conversation Timeline" on a
// request's detail panel. The request's own `description` above renders as
// the first bubble (not duplicated into a reply doc); every reply after that
// (parent or faculty) lives here, plus an auto-posted "system" entry each
// time the Class Teacher changes `status`.
export interface ParentRequestReply {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: "parent" | "faculty" | "system";
  text: string;
  sentAt: number | null;
}

export interface LeaveRequest {
  id: string;
  schoolId: string;
  studentId: string;
  classSectionId: string;
  parentUid: string;
  fromDate: string;
  toDate: string;
  reason: string;
  recipient: "PRINCIPAL" | "ADMIN" | "CLASS_TEACHER";
  /** Who's applying — shown to the Class Teacher alongside their contact number. */
  applicantRelation?: "FATHER" | "MOTHER" | "GUARDIAN";
  applicantMobile?: string;
  status: RequestStatus;
  remark?: string;
  reviewedByUid?: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Parent Communication
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  schoolId: string;
  classSectionId: string;
  studentId: string;
  facultyUid: string;
  parentUid: string;
  participantUids: string[]; // [facultyUid, parentUid], denormalized for rules
  lastMessageAt: number | null;
  lastMessageText?: string;
}

export interface ConversationMessage {
  id: string;
  senderUid: string;
  text: string;
  sentAt: number | null;
  readBy: string[];
}

export interface Announcement {
  id: string;
  schoolId: string;
  classSectionId: string;
  title: string;
  message: string;
  createdByUid: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Circulars / Events / Activities (school-wide)
// ---------------------------------------------------------------------------

export interface Circular {
  id: string;
  schoolId: string;
  title: string;
  message?: string;
  attachmentUrl?: string;
  /** Set when this circular was auto-posted alongside a Holiday declaration
   * (see app/admin/holidays) rather than authored directly — same collection,
   * same rules, just a traceability pointer back to the holidays/{id} doc. */
  relatedHolidayId?: string;
  postedByUid: string;
  createdAt: number | null;
}

export interface SchoolEvent {
  id: string;
  schoolId: string;
  name: string;
  date: string;
  time?: string;
  venue?: string;
  description?: string;
  photoUrl?: string;
  createdByUid: string;
  createdAt: number | null;
}

export interface Activity {
  id: string;
  schoolId: string;
  name: string;
  category: string;
  description?: string;
  venue?: string;
  date: string;
  time?: string;
  registrationInfo?: string;
  registrationDeadline?: string;
  status: "UPCOMING" | "OPEN" | "CLOSED" | "COMPLETED";
  createdByUid: string;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export interface TransportBus {
  id: string;
  schoolId: string;
  busNumber: string;
  driverName: string;
  driverMobile: string;
  vehicleRegNo: string;
  capacity: number;
  areaCovered?: string;
  route?: string;
  boardingPoints: string[];
  /** Default per-student fee for this bus — a student's actual paid status lives on Student.transport.feePaid. */
  fee?: number;
  gpsTrackerId?: string;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
}

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------

export interface TimetablePeriod {
  periodNumber: number;
  subject: string;
  facultyName: string;
  facultyUid?: string;
  startTime: string;
  endTime: string;
}

export interface Timetable {
  id: string; // == classSectionId
  schoolId: string;
  classSectionId: string;
  periods: TimetablePeriod[];
  uploadedByUid: string;
  updatedAt: number | null;
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

// id == `${schoolId}_${classId}_${academicYear}` — a direct doc lookup, not a
// query, so no Firestore rule-provability concerns (see lib/students.ts's
// assertAdmissionNoAvailable comment for what that class of bug looks like).
export interface FeeStructure {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  academicYear: string;
  // Fixed per class (see lib/feeStructures.ts's DEFAULT_TUITION_FEE_BY_CLASS_ID)
  // — not admin-editable, unlike books/uniform below.
  tuition: number;
  books: number;
  uniform: number;
  total: number;
  updatedByUid: string;
  updatedAt: number | null;
}

export interface StudentFee {
  id: string; // == studentId
  schoolId: string;
  studentId: string;
  classSectionId: string;
  academicYear: string;
  // Snapshot of the class FeeStructure at save time, so a later edit to the
  // class-wide structure doesn't silently change an already-saved student's
  // numbers.
  tuitionFee: number;
  booksFee: number;
  uniformFee: number;
  tuitionDiscountPct: number;
  booksDiscountPct: number;
  tuitionDiscountAmount: number;
  booksDiscountAmount: number;
  totalAmount: number; // tuitionFee + booksFee + uniformFee
  concessionAmount: number; // tuitionDiscountAmount + booksDiscountAmount
  payable: number; // totalAmount - concessionAmount ("Final Total Fee After Discount")
  // Not yet surfaced anywhere (payment recording is a later build) — always
  // paid: 0, due: payable, status: 'DUE' for now.
  paid: number;
  due: number;
  status: "PAID" | "PARTIAL" | "DUE";
  updatedByUid: string;
  updatedAt: number | null;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentType =
  | "AADHAAR"
  | "BIRTH_CERTIFICATE"
  | "STUDY_CERTIFICATE"
  | "CONDUCT_CERTIFICATE"
  | "TRANSFER_CERTIFICATE"
  | "MEDICAL_CERTIFICATE"
  | "PASSPORT_PHOTO"
  | "OTHER";

export interface StudentDocument {
  id: string;
  schoolId: string;
  studentId: string;
  docType: DocumentType;
  fileUrl: string;
  uploadedByUid: string;
  verificationStatus: RequestStatus;
  verifiedByUid?: string;
  uploadedAt: number | null;
}

// documentRequirements/{classSectionId} — which DocumentTypes the Class
// Teacher (or Admin) has opened up for parents to upload for this section;
// `documents` itself has no "is this type enabled" gate at the rules layer
// (a parent can always upload for their own child) — this is a UI-level
// checklist the Documents page reads to decide which upload buttons to show.
export interface DocumentRequirement {
  id: string; // == classSectionId
  schoolId: string;
  classSectionId: string;
  enabledTypes: DocumentType[];
  updatedByUid: string;
  updatedAt: number | null;
}

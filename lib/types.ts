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
  color: string | null;
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
  id: string;
  schoolId: string;
  facultyUid: string;
  classSectionId: string;
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

  transport?: TransportInfo;

  status: "active" | "inactive" | "transferred";
  createdByUid: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "LEAVE";

export interface AttendanceRecord {
  id: string; // `${studentId}_${date}`
  schoolId: string;
  classSectionId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remark?: string;
  markedByUid: string;
}

// ---------------------------------------------------------------------------
// Assignments / Achievements / Assessments
// ---------------------------------------------------------------------------

export interface Assignment {
  id: string;
  schoolId: string;
  classSectionId: string;
  subjectId?: string;
  subjectName: string;
  facultyUid: string;
  date: string;
  classwork?: string;
  homework?: string;
  attachments?: string[];
  dueDate?: string;
  createdAt: number | null;
}

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
}

export type AssessmentType =
  | "ASSIGNMENT"
  | "UNIT_TEST"
  | "MONTHLY_TEST"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "PRE_FINAL"
  | "FINAL"
  | "PRACTICAL"
  | "PROJECT";

export interface Assessment {
  id: string;
  schoolId: string;
  studentId: string;
  classSectionId: string;
  subjectName: string;
  examType: AssessmentType;
  marksObtained: number;
  totalMarks: number;
  grade?: string;
  remarks?: string;
  facultyUid: string;
  createdAt: number | null;
}

// ---------------------------------------------------------------------------
// Parent Requests / Leave Requests
// ---------------------------------------------------------------------------

export type RequestStatus = "pending" | "approved" | "rejected";

export interface ParentRequest {
  id: string;
  schoolId: string;
  studentId: string;
  classSectionId: string;
  parentUid: string;
  type: "ADDRESS" | "MOBILE" | "GUARDIAN_INFO" | "MEDICAL_INFO" | "PHOTO";
  payload: Record<string, unknown>;
  status: RequestStatus;
  remark?: string;
  reviewedByUid?: string;
  createdAt: number | null;
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

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYear: string;
  className: string;
  admission: number;
  tuition: number;
  books: number;
  uniform: number;
  transport?: number;
  otherCharges?: number;
  total: number;
}

export interface StudentFee {
  id: string; // == studentId
  schoolId: string;
  studentId: string;
  classSectionId: string;
  academicYear: string;
  booksDiscountPct: number;
  tuitionDiscountPct: number;
  totalAmount: number;
  concessionAmount: number;
  payable: number;
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

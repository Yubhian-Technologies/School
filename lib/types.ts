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
  adminName: string;
  createdAt: number | null;
}

export type PeriodType = "period" | "break";

export interface PeriodColumn {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  type: PeriodType;
}

export interface TimetableConfig {
  schoolId: string;
  periods: PeriodColumn[];
  updatedAt: number | null;
}

export interface TimetableSection {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  createdAt: number | null;
}

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface GridCell {
  text: string;
  span: number;
}

export type GridRow = Record<string, GridCell>;

export interface TimetableGrid {
  id: string;
  schoolId: string;
  classId: string;
  sectionId: string;
  cells: Record<DayOfWeek, GridRow>;
  updatedAt: number | null;
}

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

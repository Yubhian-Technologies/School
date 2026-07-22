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

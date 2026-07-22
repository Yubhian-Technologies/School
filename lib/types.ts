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

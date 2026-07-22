import type { Role } from "./types";

export const ROLE_HOME: Record<Role, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  parent: "/parent/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  faculty: "Faculty",
  parent: "Parent",
};

export interface NavItem {
  label: string;
  href: string;
}

export const SUPERADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/superadmin/dashboard" },
  { label: "Schools", href: "/superadmin/schools" },
  { label: "Admins", href: "/superadmin/admins" },
  { label: "Profile", href: "/superadmin/profile" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Faculty", href: "/admin/faculty" },
  { label: "Transport", href: "/admin/transport" },
  { label: "Timetable", href: "/admin/timetable" },
  { label: "Fees", href: "/admin/fees" },
  { label: "Circulars", href: "/admin/circulars" },
  { label: "Events", href: "/admin/events" },
];

// No class/subject selection logic yet — nav links point at a placeholder
// classId so the routes are reachable before real class data exists.
export const DEMO_CLASS_ID = "demo-class";

export const FACULTY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/faculty/dashboard" },
  { label: "Class · Students", href: `/faculty/class/${DEMO_CLASS_ID}/students` },
  { label: "Class · Attendance", href: `/faculty/class/${DEMO_CLASS_ID}/attendance` },
  { label: "Class · Assignments", href: `/faculty/class/${DEMO_CLASS_ID}/assignments` },
  { label: "Class · Achievements", href: `/faculty/class/${DEMO_CLASS_ID}/achievements` },
  { label: "Class · Parent Requests", href: `/faculty/class/${DEMO_CLASS_ID}/parent-requests` },
  { label: "Class · Leaves", href: `/faculty/class/${DEMO_CLASS_ID}/leaves` },
  { label: "Class · Messages", href: `/faculty/class/${DEMO_CLASS_ID}/messages` },
  { label: "Class · Announcements", href: `/faculty/class/${DEMO_CLASS_ID}/announcements` },
  { label: "Subject · Students", href: `/faculty/subject/${DEMO_CLASS_ID}/students` },
  { label: "Subject · Assignments", href: `/faculty/subject/${DEMO_CLASS_ID}/assignments` },
  { label: "Subject · Assessments", href: `/faculty/subject/${DEMO_CLASS_ID}/assessments` },
  { label: "Circulars", href: "/faculty/circulars" },
  { label: "Events", href: "/faculty/events" },
  { label: "Profile", href: "/faculty/profile" },
];

export const PARENT_NAV: NavItem[] = [
  { label: "Profile", href: "/parent/profile" },
  { label: "Academics", href: "/parent/academics" },
  { label: "Assignments", href: "/parent/assignments" },
  { label: "Assessments", href: "/parent/assessments" },
  { label: "Activities", href: "/parent/activities" },
  { label: "Achievements", href: "/parent/achievements" },
  { label: "Attendance", href: "/parent/attendance" },
  { label: "Fees", href: "/parent/fees" },
  { label: "Leaves", href: "/parent/leaves" },
  { label: "Circulars", href: "/parent/circulars" },
  { label: "Transport", href: "/parent/transport" },
  { label: "Route Map", href: "/parent/route-map" },
  { label: "Documents", href: "/parent/documents" },
];

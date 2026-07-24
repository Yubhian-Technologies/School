import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Library,
  Map,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  Sparkles,
  UserCog,
  User as UserIcon,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Omit for a top-level group rendered without an uppercase label (e.g. "Dashboard"). */
  label?: string;
  items: NavItem[];
}

export const SUPERADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard }] },
  {
    label: "Platform",
    items: [
      { label: "Schools", href: "/superadmin/schools", icon: GraduationCap },
      { label: "Admins", href: "/superadmin/admins", icon: UserCog },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Profile", href: "/superadmin/profile", icon: UserIcon }],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }] },
  {
    label: "Academics",
    items: [
      { label: "Classes", href: "/admin/classes", icon: Layers },
      { label: "Subjects", href: "/admin/subjects", icon: Library },
      { label: "Faculty", href: "/admin/faculty", icon: Users },
      { label: "Timetable", href: "/admin/timetable", icon: CalendarClock },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Transport", href: "/admin/transport", icon: Bus },
      { label: "Fees", href: "/admin/fees", icon: Wallet },
    ],
  },
  {
    label: "Communications",
    items: [
      { label: "Circulars", href: "/admin/circulars", icon: Megaphone },
      { label: "Events", href: "/admin/events", icon: CalendarDays },
    ],
  },
];

// No class/subject selection logic yet — nav links point at a placeholder
// classId so the routes are reachable before real class data exists. The
// Class Teacher · Students page ignores this in favor of resolving the
// teacher's real classSectionId — see lib/classSections.ts.
export const DEMO_CLASS_ID = "demo-class";

export const FACULTY_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
      { label: "Timetable", href: "/faculty/timetable", icon: CalendarClock },
    ],
  },
  {
    label: "Class Teacher",
    items: [
      { label: "Students", href: `/faculty/class/${DEMO_CLASS_ID}/students`, icon: GraduationCap },
      { label: "Attendance", href: `/faculty/class/${DEMO_CLASS_ID}/attendance`, icon: CalendarCheck },
      { label: "Assignments", href: `/faculty/class/${DEMO_CLASS_ID}/assignments`, icon: FileText },
      { label: "Achievements", href: `/faculty/class/${DEMO_CLASS_ID}/achievements`, icon: Award },
      { label: "Parent Requests", href: `/faculty/class/${DEMO_CLASS_ID}/parent-requests`, icon: MessageSquareText },
      { label: "Leaves", href: `/faculty/class/${DEMO_CLASS_ID}/leaves`, icon: CalendarClock },
      { label: "Messages", href: `/faculty/class/${DEMO_CLASS_ID}/messages`, icon: MessageCircle },
      { label: "Announcements", href: `/faculty/class/${DEMO_CLASS_ID}/announcements`, icon: Megaphone },
    ],
  },
  {
    label: "Subject Teacher",
    items: [
      { label: "Students", href: `/faculty/subject/${DEMO_CLASS_ID}/students`, icon: Library },
      { label: "Assignments", href: "/faculty/subject/assignments", icon: FileText },
      { label: "Assessments", href: `/faculty/subject/${DEMO_CLASS_ID}/assessments`, icon: ClipboardCheck },
    ],
  },
  {
    label: "General",
    items: [
      { label: "Circulars", href: "/faculty/circulars", icon: Megaphone },
      { label: "Events", href: "/faculty/events", icon: CalendarDays },
      { label: "Profile", href: "/faculty/profile", icon: UserIcon },
    ],
  },
];

export const PARENT_NAV: NavGroup[] = [
  { items: [{ label: "Profile", href: "/parent/profile", icon: UserIcon }] },
  {
    label: "Academics",
    items: [
      { label: "Academics", href: "/parent/academics", icon: BookOpen },
      { label: "Assignments", href: "/parent/assignments", icon: FileText },
      { label: "Assessments", href: "/parent/assessments", icon: ClipboardCheck },
      { label: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
      { label: "Achievements", href: "/parent/achievements", icon: Award },
    ],
  },
  {
    label: "School Life",
    items: [
      { label: "Activities", href: "/parent/activities", icon: Sparkles },
      { label: "Circulars", href: "/parent/circulars", icon: Megaphone },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Fees", href: "/parent/fees", icon: Wallet },
      { label: "Leaves", href: "/parent/leaves", icon: ClipboardList },
      { label: "Documents", href: "/parent/documents", icon: FileText },
    ],
  },
  {
    label: "Transport",
    items: [
      { label: "Transport", href: "/parent/transport", icon: Bus },
      { label: "Route Map", href: "/parent/route-map", icon: Map },
    ],
  },
];

export const NOTIFICATIONS_ICON: LucideIcon = Bell;

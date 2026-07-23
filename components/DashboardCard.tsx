import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { CardColor } from "./StatCard";

const COLOR_CLASSES: Record<CardColor, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  amber: "bg-amber-50 text-amber-600",
};

export function DashboardSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

export default function DashboardCard({
  icon: Icon,
  title,
  subtitle,
  href,
  color,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
  color: CardColor;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${COLOR_CLASSES[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
      </div>
    </Link>
  );
}

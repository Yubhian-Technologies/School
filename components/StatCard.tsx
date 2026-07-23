import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type CardColor = "indigo" | "purple" | "green" | "orange" | "pink" | "amber";

const COLOR_CLASSES: Record<CardColor, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  amber: "bg-amber-50 text-amber-600",
};

function StatCardInner({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: CardColor;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${COLOR_CLASSES[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function StatCard(props: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: CardColor;
  href?: string;
}) {
  if (props.href) {
    return (
      <Link href={props.href} className="block transition-transform hover:-translate-y-0.5">
        <StatCardInner {...props} />
      </Link>
    );
  }
  return <StatCardInner {...props} />;
}

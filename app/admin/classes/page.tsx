import Link from "next/link";
import { CLASS_LIST } from "@/lib/classes";

export default function AdminClassesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">Classes</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {CLASS_LIST.map((cls) => (
          <Link
            key={cls.id}
            href={`/admin/classes/${cls.id}`}
            className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-700"
          >
            {cls.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

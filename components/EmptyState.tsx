export default function EmptyState({
  title,
  message = "No data yet — coming soon.",
}: {
  title: string;
  message?: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

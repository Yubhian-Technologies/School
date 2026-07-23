import PageHeader from "./PageHeader";

export default function EmptyState({
  title,
  message = "No data yet — coming soon.",
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} />
      <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

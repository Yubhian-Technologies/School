export default function EmptyTimetableState({
  onCreate,
  creating,
}: {
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
      <div className="text-4xl">📅</div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">No Timetable Created</h2>
      <p className="mt-1 text-sm text-gray-500">
        This section does not have a timetable yet.
      </p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        {creating ? "Creating…" : "Create Timetable"}
      </button>
    </div>
  );
}

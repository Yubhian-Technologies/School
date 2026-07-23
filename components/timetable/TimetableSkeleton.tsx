export default function TimetableSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="h-10 w-28 shrink-0 border-r border-gray-200 bg-gray-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 flex-1 border-r border-gray-200 last:border-r-0" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="flex border-b border-gray-100 last:border-b-0">
          <div className="h-12 w-28 shrink-0 border-r border-gray-200 bg-gray-50" />
          {Array.from({ length: 5 }).map((_, col) => (
            <div key={col} className="h-12 flex-1 border-r border-gray-100 p-2 last:border-r-0">
              <div className="h-full w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface ListSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function ListSkeleton({ rows = 6, columns = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-3 p-5" aria-label="Loading list" aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-3 sm:grid-cols-5">
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

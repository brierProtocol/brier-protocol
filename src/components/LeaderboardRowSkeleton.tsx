'use client';

export function LeaderboardRowSkeleton() {
  return (
    <div className="bg-white/50 rounded-[20px] p-4 flex flex-col md:flex-row items-center gap-4 md:gap-6 animate-pulse">
      <div className="flex items-center gap-6 flex-1 w-full">
        <div className="h-8 w-10 bg-gray-200 rounded" />
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 md:gap-8 flex-1 w-full md:w-auto">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
      </div>
      <div className="w-full md:w-24 h-10 bg-gray-200 rounded-full" />
    </div>
  );
}

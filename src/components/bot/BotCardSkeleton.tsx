'use client';

export function BotCardSkeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white/50 animate-pulse">
      <div className="flex flex-col items-center pt-8 pb-4 px-5 h-[200px]">
        <div className="w-24 h-24 rounded-full bg-gray-200" />
        <div className="h-6 w-32 bg-gray-200 rounded mt-4" />
        <div className="h-3 w-20 bg-gray-200 rounded mt-2" />
        <div className="h-6 w-16 bg-gray-200 rounded-full mt-3" />
      </div>
      <div className="mx-2 mb-2 rounded-[16px] bg-white p-4 h-[80px]">
        <div className="grid grid-cols-3 gap-3">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

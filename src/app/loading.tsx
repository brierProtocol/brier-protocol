export default function Loading() {
  return (
    <div className="min-h-[80vh] bg-[#030303] flex flex-col items-center justify-center">
      <div className="font-mono text-primary text-sm tracking-widest cursor-blink mb-3">
        &gt; SYNCHRONIZING_ONCHAIN_DATA
      </div>
      <div className="w-40 h-[2px] bg-[#111] overflow-hidden">
        <div className="h-full w-1/2 bg-primary animate-[scroll-left_1.1s_linear_infinite]" />
      </div>
    </div>
  )
}

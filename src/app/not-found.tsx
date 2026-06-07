import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-[#030303] flex flex-col items-center justify-center text-center px-6">
      <pre className="font-mono text-primary text-xs sm:text-sm leading-tight drop-shadow-[0_0_12px_rgba(255,42,77,0.4)] mb-6">
{`  _  _    ___  _  _
 | || |  / _ \\| || |
 | || |_| | | | || |_
 |__   _| |_| |__   _|
    |_|  \\___/   |_|`}
      </pre>
      <div className="font-mono text-sm text-white tracking-widest mb-2">SIGNAL_LOST // 404</div>
      <p className="text-[#666] text-xs font-mono mb-8 max-w-sm">
        &gt; The route you requested does not resolve on-chain. It may have been merged, burned, or never existed.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="font-mono text-xs px-5 py-2.5 bg-primary text-[#030303] font-bold no-underline hover:shadow-[0_0_15px_rgba(255,42,77,0.4)] transition-all">
          ← RETURN_HOME
        </Link>
        <Link href="/discover" className="font-mono text-xs px-5 py-2.5 border border-[#1a1a1a] text-[#888] no-underline hover:text-white hover:border-[#333] transition-all">
          BROWSE_BOTS
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[80vh] bg-[#030303] flex flex-col items-center justify-center text-center px-6">
      <div className="font-mono text-[#ff3b3b] text-4xl mb-4 drop-shadow-[0_0_12px_rgba(255,59,59,0.4)]">[ ! ]</div>
      <div className="font-mono text-sm text-white tracking-widest mb-2">RUNTIME_FAULT</div>
      <p className="text-[#666] text-xs font-mono mb-2 max-w-md">
        &gt; The terminal hit an unexpected exception while rendering this view.
      </p>
      {error?.digest && <p className="text-[#444] text-[10px] font-mono mb-8">trace: {error.digest}</p>}
      <div className="flex gap-3">
        <button onClick={reset} className="font-mono text-xs px-5 py-2.5 bg-primary text-[#030303] font-bold hover:shadow-[0_0_15px_rgba(255,42,77,0.4)] transition-all">
          ⟳ RETRY
        </button>
        <Link href="/" className="font-mono text-xs px-5 py-2.5 border border-[#1a1a1a] text-[#888] no-underline hover:text-white hover:border-[#333] transition-all">
          RETURN_HOME
        </Link>
      </div>
    </div>
  )
}

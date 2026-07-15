// Site-wide compliance strip. Brier's contracts are UNAUDITED and live on the
// Polygon Amoy testnet only — this bar makes that unmissable on every page so no
// visitor (or investor) mistakes the app for a production, audited product.
export default function DisclaimerBar() {
  return (
    <div
      role="note"
      className="relative z-10 border-t border-[#141414] bg-[#050505]"
    >
      <div className="max-w-[1180px] mx-auto px-6 py-3 flex items-center justify-center gap-2 text-center">
        <span className="text-[#ff8a3c] text-[11px] leading-none" aria-hidden>⚠</span>
        <span className="font-mono text-[10px] sm:text-[11px] tracking-wide text-[#8a8a94]">
          Unaudited software · Polygon Amoy testnet only — smart contracts are <span className="text-[#c9c9d1] font-semibold">not audited</span>. Do not deposit real funds.
        </span>
      </div>
    </div>
  )
}

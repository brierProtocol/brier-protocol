'use client'

// Anonymous discussion-thread rendering for a bot's board.
// Extracted from bot/[slug] so the identity + text-render logic lives in one place.

/** Deterministic anonymous poster identity (6-char ID + hue) derived from a wallet. */
export function posterId(wallet: string): { id: string; hue: number } {
  let h = 0
  for (let i = 0; i < wallet.length; i++) h = (Math.imul(h, 31) + wallet.charCodeAt(i)) | 0
  const id = Math.abs(h).toString(36).padStart(6, '0').slice(0, 6).toUpperCase()
  return { id, hue: Math.abs(h) % 360 }
}

/** Thread text renderer: greentext lines + `>>NN` quote-links. */
export function PostBody({ text, onQuoteClick }: { text: string; onQuoteClick: (n: number) => void }) {
  const lines = text.split('\n')
  return (
    <div className="post-text">
      {lines.map((line, li) => {
        const parts = line.split(/(>>\d{1,5})/g)
        const isGreen = line.trimStart().startsWith('>') && !line.trimStart().startsWith('>>')
        return (
          <div key={li} className={isGreen ? 'greentext' : undefined}>
            {parts.map((p, pi) => {
              const m = p.match(/^>>(\d{1,5})$/)
              if (m) {
                const n = parseInt(m[1], 10)
                return (
                  <a key={pi} className="quotelink" onClick={() => onQuoteClick(n)}>
                    {p}
                  </a>
                )
              }
              return <span key={pi}>{p}</span>
            })}
            {line === '' ? ' ' : ''}
          </div>
        )
      })}
    </div>
  )
}

export default PostBody

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

/**
 * Owner-only panel to generate / list / revoke a bot's API keys. The owner signs
 * a wallet message (must match lib/owner-auth.ts byte-for-byte) and the route
 * verifies it. The raw secret is shown exactly once after creation.
 */

type KeyRow = { id: string; label: string; masked: string; lastUsedAt: string | null; revoked: boolean; createdAt: string }

// Must match ownershipMessage() in src/lib/owner-auth.ts exactly.
function ownershipMessage(botId: string, address: string, timestamp: number): string {
  return ['Brier API key management', `Bot: ${botId}`, `Wallet: ${address}`, `Time: ${timestamp}`].join('\n')
}

export default function ApiKeysManager({ botId }: { botId: string }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [keys, setKeys] = useState<KeyRow[]>([])
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/keys`)
      if (res.ok) setKeys((await res.json()).keys ?? [])
    } catch { /* non-fatal */ }
  }, [botId])

  useEffect(() => { loadKeys() }, [loadKeys])

  async function sign(): Promise<{ address: string; signature: string; timestamp: number }> {
    if (!address) throw new Error('Connect your wallet')
    const timestamp = Date.now()
    const signature = await signMessageAsync({ message: ownershipMessage(botId, address, timestamp) })
    return { address, signature, timestamp }
  }

  async function generate() {
    setBusy(true); setError(null); setNewSecret(null)
    try {
      const proof = await sign()
      const res = await fetch(`/api/bots/${botId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...proof, label: 'default' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to generate key')
      setNewSecret(d.secret)
      await loadKeys()
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to generate key')
    } finally { setBusy(false) }
  }

  async function revoke(keyId: string) {
    setBusy(true); setError(null)
    try {
      const { address: a, signature, timestamp } = await sign()
      const qs = new URLSearchParams({ address: a, signature, timestamp: String(timestamp) })
      const res = await fetch(`/api/bots/${botId}/keys/${keyId}?${qs.toString()}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to revoke')
      await loadKeys()
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to revoke')
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#080809] p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#888]">Bot API keys</span>
        <button
          onClick={generate}
          disabled={busy || !isConnected}
          className="font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {busy ? 'Signing…' : 'Generate API key'}
        </button>
      </div>
      <p className="text-[#5a5a64] text-[12px] leading-relaxed mb-4">
        Sign with your wallet to mint a signing key. Your bot uses it to send predictions and signals.
      </p>

      {error && <div className="text-[#ff5570] text-[12px] font-mono mb-3">{error}</div>}

      {newSecret && (
        <div className="rounded-xl border border-primary/30 bg-primary/05 p-4 mb-4">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-2">New key — shown once</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-[12px] text-white break-all bg-black/40 rounded px-2 py-1.5">{newSecret}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(newSecret); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
              className="shrink-0 font-mono text-[10px] px-2 py-1.5 border border-[#222] text-[#aaa] hover:border-primary/40 hover:text-primary transition-colors rounded"
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <div className="text-[#888] text-[11px] mt-2">Store it now. It will not be shown again.</div>
        </div>
      )}

      {keys.length > 0 ? (
        <div className="flex flex-col gap-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#141414] bg-[#0b0b0c] px-3 py-2">
              <div className="min-w-0">
                <code className="font-mono text-[12px] text-[#ccc]">{k.masked}</code>
                <span className="ml-2 font-mono text-[10px] text-[#555]">
                  {k.revoked ? 'revoked' : k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'never used'}
                </span>
              </div>
              {!k.revoked && (
                <button
                  onClick={() => revoke(k.id)}
                  disabled={busy}
                  className="shrink-0 font-mono text-[10px] text-[#777] hover:text-[#ff5570] disabled:opacity-40 transition-colors"
                >
                  REVOKE
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[#444] text-[12px] font-mono">No keys yet.</div>
      )}
    </div>
  )
}

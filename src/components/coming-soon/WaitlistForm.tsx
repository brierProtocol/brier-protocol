'use client'

import { useState } from 'react'

interface Props { onSuccess: () => void }

type Status = 'idle' | 'loading' | 'error' | 'duplicate'

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function WaitlistForm({ onSuccess }: Props) {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return

    if (!RE_EMAIL.test(email.trim())) {
      setStatus('error')
      setErrMsg('Enter a valid email address.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (res.ok) { onSuccess(); return }

      const data = await res.json()
      if (data.error === 'duplicate') {
        setStatus('duplicate')
      } else {
        setStatus('error')
        setErrMsg('Something went wrong. Try again.')
      }
    } catch {
      setStatus('error')
      setErrMsg('Network error. Try again.')
    }
  }

  const isLoading = status === 'loading'

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setStatus('idle') }}
            disabled={isLoading}
            autoComplete="email"
            style={{
              flex: 1,
              minWidth: 0,
              padding: '13px 20px',
              borderRadius: 9999,
              border: status === 'error'
                ? '0.5px solid rgba(255,59,59,0.5)'
                : '0.5px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e8e8e8',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '13px 26px',
              borderRadius: 9999,
              background: isLoading ? 'rgba(255,42,77,0.4)' : '#FF2A4D',
              color: isLoading ? 'rgba(3,3,3,0.5)' : '#030303',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background 0.2s, box-shadow 0.2s',
              boxShadow: isLoading ? 'none' : '0 0 18px rgba(255,42,77,0.35)',
            }}
          >
            {isLoading ? '···' : 'Join waitlist'}
          </button>
        </div>

        {status === 'error' && (
          <p style={{
            margin: '10px 0 0 20px',
            fontSize: 12,
            color: '#ff3b3b',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {errMsg}
          </p>
        )}

        {status === 'duplicate' && (
          <p style={{
            margin: '10px 0 0 20px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            You're already on the list. We'll reach out soon.
          </p>
        )}
      </form>
    </div>
  )
}

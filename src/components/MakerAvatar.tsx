'use client'

import { deriveAvatarColor } from '@/lib/botIdentity'

/**
 * Human (maker) avatar. Square, distinct per wallet, changeable.
 *
 * Unlike bots, which render a robotic generative eye, a human account gets a
 * clean square portrait: a person silhouette over a tint derived from the
 * wallet address, so every maker looks different yet unmistakably human. When
 * the user uploads a real picture (User.pfpUrl) we render that instead.
 */
export default function MakerAvatar({
  address,
  pfpUrl,
  size = 32,
  className = '',
  square = false,
}: {
  address?: string | null
  pfpUrl?: string | null
  size?: number
  className?: string
  /** Hard square: no rounded corners, no border ring — just the portrait. */
  square?: boolean
}) {
  const radius = square ? 0 : Math.round(size * 0.22)
  const ring = square ? '' : 'border border-white/15'

  if (pfpUrl) {
    return (
      <span
        className={`inline-block overflow-hidden shrink-0 ${ring} ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pfpUrl} alt="" className="w-full h-full object-cover" />
      </span>
    )
  }

  const color = deriveAvatarColor((address || 'anon').toLowerCase())

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden shrink-0 ${ring} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(145deg, ${color}38 0%, #0b0b0c 72%)`,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size * 0.66} height={size * 0.66} fill="none">
        <circle cx="20" cy="15" r="7.2" fill={color} fillOpacity="0.92" />
        <path d="M5 40c0-8.3 6.7-15 15-15s15 6.7 15 15" fill={color} fillOpacity="0.92" />
      </svg>
    </span>
  )
}

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import BotIrisAvatar from './BotIrisAvatar'
import { botEye } from '@/lib/botIdentity'
import type { Bot } from '@/data/bots'

interface BotCardProps {
  bot: Bot
  rank: number
  onClick?: () => void
}

// We still calculate mood if needed by other components, but no longer import Mood type here
function getMoodFromStats(bot: Bot): string {
  if ((bot as any).fraudFlag > 0) return 'suspicious'
  if (bot.maxDrawdown < -0.15) return 'sad'
  if (bot.brierScore < 0.20 && bot.winRate > 0.57) return 'cool'
  if (bot.brierScore < 0.25 && bot.winRate > 0.54) return 'happy'
  if (bot.brierScore > 0.28 || bot.winRate < 0.50) return 'anxious'
  return 'neutral'
}

// Status badge config
const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  PAPER:              { label: 'Paper Trading', color: '#888', dot: '#888' },
  LIVE:               { label: 'Live',          color: '#C8FF00', dot: '#C8FF00' },
  VAULT_ELIGIBLE_T1:  { label: 'Vault T1',      color: '#3B82F6', dot: '#3B82F6' },
  VAULT_ELIGIBLE_T2:  { label: 'Vault T2',      color: '#D4AF37', dot: '#D4AF37' },
  SUSPENDED:          { label: 'Suspended',     color: '#FF3B3B', dot: '#FF3B3B' },
  live:               { label: 'Live',          color: '#C8FF00', dot: '#C8FF00' },
  paused:             { label: 'Paused',        color: '#FFB800', dot: '#FFB800' },
}

// Glow per status
const glowMap: Record<string, string> = {
  VAULT_ELIGIBLE_T2: '0 0 40px rgba(212,175,55,0.12), 0 0 0 0.5px rgba(212,175,55,0.15)',
  VAULT_ELIGIBLE_T1: '0 0 30px rgba(59,130,246,0.10), 0 0 0 0.5px rgba(59,130,246,0.12)',
  LIVE:              '0 0 20px rgba(200,255,0,0.06)',
  live:              '0 0 20px rgba(200,255,0,0.06)',
  SUSPENDED:         '0 0 20px rgba(255,59,59,0.06)',
  PAPER:             'none',
}

export function BotCard({ bot, rank, onClick }: BotCardProps) {
  const mood = getMoodFromStats(bot)
  const status = statusConfig[bot.status] || statusConfig.PAPER
  const glow = glowMap[bot.status] || 'none'
  const isTopRank = rank <= 3

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative cursor-pointer group h-full"
    >
      <Link href={`/vault/${bot.id}`} className="block h-full">
        <div
          className="h-full relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            boxShadow: glow,
            padding: '20px',
          }}
        >
          {/* Hover border reveal */}
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{
              border: `0.5px solid ${status.color}33`,
              borderRadius: '24px',
              transition: 'opacity 0.2s ease',
            }}
          />

          {/* Rank badge */}
          <div
            className="absolute top-4 right-4 font-mono text-xs font-bold"
            style={{ color: isTopRank ? status.color : 'rgba(255,255,255,0.2)' }}
          >
            #{String(rank).padStart(2, '0')}
          </div>

          {/* Top row: Character + Name + Status */}
          <div className="flex items-center gap-4 mb-5">
            {/* Character */}
            <div className="relative flex-shrink-0">
              <BotIrisAvatar {...botEye(bot)} size={72} />
              {/* Status dot on character */}
              <div
                className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2"
                style={{
                  background: status.dot,
                  borderColor: '#0F0F0F',
                  boxShadow: `0 0 8px ${status.dot}`,
                }}
              />
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              <h3
                className="font-bold truncate text-lg leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                }}
              >
                {bot.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: status.color }}
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: status.color,
                  }}
                >
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Stats grid — 3 key metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {
                label: 'BRIER',
                value: bot.brierScore?.toFixed(3) ?? '—',
                good: bot.brierScore < 0.25,
              },
              {
                label: 'WIN RATE',
                value: bot.winRate ? `${(bot.winRate * 100).toFixed(1)}%` : '—',
                good: bot.winRate > 0.54,
              },
              {
                label: 'SHARPE',
                value: bot.sharpe?.toFixed(2) ?? '—',
                good: bot.sharpe! > 1.5,
              },
            ].map(({ label, value, good }) => (
              <div
                key={label}
                className="flex flex-col gap-0.5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                <span
                  className="text-[10px] font-bold tracking-widest"
                  style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)' }}
                >
                  {label}
                </span>
                <span
                  className="text-xl font-bold leading-tight"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: good ? '#C8FF00' : '#FFFFFF',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Vault bar (if vault eligible) */}
          {(bot.status === 'VAULT_ELIGIBLE_T1' || bot.status === 'VAULT_ELIGIBLE_T2' || bot.tier !== 'NONE') && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1.5">
                <span
                  className="text-[10px] font-bold tracking-widest"
                  style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)' }}
                >
                  VAULT TVL
                </span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: status.color === '#888' ? '#FFFFFF' : status.color }}
                >
                  ${(bot.tvl / 1000).toFixed(0)}K / ${(bot.vaultCap / 1000000).toFixed(1)}M
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: status.color === '#888' ? '#FFFFFF' : status.color }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((bot.tvl / bot.vaultCap) * 100, 100)}%`
                  }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Fraud flag warning (simulated) */}
          {mood === 'suspicious' && (
            <div
              className="mt-3 flex items-center gap-2 text-xs rounded-xl px-3 py-2"
              style={{
                background: 'rgba(255,59,59,0.08)',
                border: '0.5px solid rgba(255,59,59,0.2)',
                color: '#FF3B3B',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span>⚠</span>
              <span className="font-medium">Pattern flag detected — review before depositing</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

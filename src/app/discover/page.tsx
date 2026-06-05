'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BotIrisAvatar from '@/components/BotIrisAvatar'
import { motion } from 'framer-motion'

export default function DiscoverPage() {
  const [activeSort, setActiveSort] = useState<'brier' | 'yield' | 'tvl' | 'new'>('brier')
  const [search, setSearch] = useState('')

  const [botsData, setBotsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBotsData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const getBrier = (b: any) => b.scores?.[0]?.brierScore ?? b.brierScore ?? 0
  const getTvl = (b: any) => b.currentTVL ?? b.tvl ?? 0
  const getYield = (b: any) => b.monthlyYield ?? 0
  const getCreated = (b: any) => new Date(b.createdAt || 0).getTime()

  const filteredBots = botsData.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !(b.builder || b.walletAddress || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (activeSort === 'brier') return getBrier(a) - getBrier(b)
    if (activeSort === 'yield') return getYield(b) - getYield(a)
    if (activeSort === 'tvl') return getTvl(b) - getTvl(a)
    if (activeSort === 'new') return getCreated(b) - getCreated(a)
    return 0
  })

  return (
    <div className="min-h-screen bg-[#030303] text-white p-12">
      
      {/* HEADER SECTION */}
      <div className="max-w-[1200px] mx-auto mb-12">
        <div className="flex justify-between items-end border-b border-[#1a1a1a] pb-6 flex-wrap gap-8">
          
          <div>
            <h1 className="font-sans font-bold text-white text-2xl tracking-tight mb-1">
              Discover Algorithms
            </h1>
            <p className="text-[#888] m-0 text-sm font-sans">
              Deploy capital into verified quantitative models.
            </p>
          </div>

          <div className="flex gap-6 items-center">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#666] text-xs font-bold">⌕</span>
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search bots..." 
                className="bg-[#0a0a0a] border border-[#1a1a1a] text-white font-sans py-2 pr-3 pl-8 outline-none w-[260px] text-xs rounded transition-colors focus:border-[#333] focus:shadow-[0_0_8px_rgba(255,255,255,0.05)] placeholder-[#444]"
              />
            </div>
            
            <Link href="/list-bot" className="text-primary text-xs font-sans font-semibold tracking-wide hover:underline hover:drop-shadow-[0_0_8px_rgba(255,42,77,0.5)] transition-all">
              Submit Algorithm
            </Link>
          </div>
        </div>
        
        {/* FILTERS */}
        <div className="flex gap-4 mt-6 text-xs items-center">
          <span className="text-[#666] font-sans text-xs">Sort by:</span>
          {[
            { id: 'brier', label: 'Brier Score' },
            { id: 'yield', label: 'Monthly Yield' },
            { id: 'tvl', label: 'TVL' },
            { id: 'new', label: 'Newest' },
          ].map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSort(s.id as any)}
              className={`bg-transparent border-none cursor-pointer tracking-wide transition-colors font-sans text-xs px-2 py-1 rounded ${activeSort === s.id ? 'text-primary font-semibold bg-primary/10' : 'text-[#888] hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto">
        
        {/* CATALOG GRID */}
        {loading ? (
          <div className="text-[#888] text-sm text-center p-16 animate-pulse font-sans">
            Loading algorithms...
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="text-[#666] text-sm text-center p-16 font-sans">
            No algorithms found
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          >
            {filteredBots.map((b, i) => {
            const brier = getBrier(b)
            const wr = b.scores?.[0]?.winRate ?? b.winRate ?? 0
            const tvl = getTvl(b)
            const yld = getYield(b)
            const isLive = (b.status || '').toLowerCase() === 'live' || (b.status || '').toLowerCase().includes('eligible')
            
            return (
            <motion.div
              key={b.id}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.97 },
                show:   { opacity: 1, y: 0,  scale: 1,    transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } }
              }}
            >
            <Link href={`/bot/${b.slug || b.id}`} className="flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg transition-all hover:bg-[#0e0e0e] hover:border-[#333] hover:shadow-[0_0_20px_rgba(255,42,77,0.08)] no-underline group relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#1a1a1a] group-hover:border-[#333] transition-colors rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#1a1a1a] group-hover:border-[#333] transition-colors rounded-br-lg" />

              <div className="text-white p-3 border-b border-[#1a1a1a] text-xs font-sans font-semibold flex justify-between items-center group-hover:text-primary transition-colors">
                <span>{b.name}</span>
                <span className={`text-[10px] font-mono tracking-wide ${isLive ? 'text-primary' : 'text-[#666]'}`}>{isLive ? 'LIVE' : 'PAPER'}</span>
              </div>

              {/* Bot Image Frame */}
              <div className="w-full bg-[#060606] flex justify-center py-6 border-b border-[#1a1a1a]">
                {b.pfpUrl ? (
                  <img src={b.pfpUrl} alt={b.name} className="w-[70px] h-[70px] rounded-full object-cover border-2 border-[#1a1a1a] group-hover:border-primary transition-colors" />
                ) : (
                  <BotIrisAvatar avatarId={b.avatarId || 'void-eye'} accentColor={b.color || '#ff2a4d'} size={70} />
                )}
              </div>

              {/* Data Rows */}
              <div className="p-4 flex flex-col gap-2 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-[#666]">Maker</span>
                  <span className="text-white font-mono">{(b.builder || b.walletAddress || 'anon').substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Brier Score</span>
                  <span className={`font-mono font-bold ${brier <= 0.25 ? 'text-primary drop-shadow-[0_0_5px_rgba(255,42,77,0.5)]' : 'text-white'}`}>{brier.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Win Rate</span>
                  <span className="text-white font-mono">{(wr * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Mth Yield</span>
                  <span className={`font-mono ${yld > 0 ? 'text-[#00d4aa]' : 'text-[#666]'}`}>{yld > 0 ? '+' : ''}{yld}%</span>
                </div>
                <div className="flex justify-between border-t border-[#1a1a1a] pt-2 mt-2">
                  <span className="text-[#666]">Vault TVL</span>
                  <span className="text-white font-mono font-bold">${tvl.toLocaleString()}</span>
                </div>
              </div>
            </Link>
            </motion.div>
            )
          })}
          </motion.div>
        )}
      </div>
    </div>
  )
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { rankBuilders, type Builder } from "@/lib/builderScore";
import styles from "./Leaderboard.module.css";
import HeroCard from "./HeroCard";
import BotIrisAvatar from "@/components/bot/BotIrisAvatar";
import { botEye } from "@/lib/botIdentity";

interface Props {
  builders: Builder[];
}

function getBuilderColor(handle: string) {
  const hash = Array.from(handle).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  return `hsl(${hue1}, 80%, 60%)`;
}

function getBuilderGradient(handle: string) {
  const hash = Array.from(handle).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 80%, 60%), hsl(${hue2}, 80%, 30%))`;
}

function BuilderFallbackAvatar({ handle, size, radius }: { handle: string, size: number, radius: string | number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: getBuilderGradient(handle),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 700, fontFamily: 'var(--sans)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)'
    }}>
      {handle.charAt(0).toUpperCase()}
    </div>
  );
}

export default function BuildersClient({ builders }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const ranked = rankBuilders(builders);
  const top3 = ranked.slice(0, 3);

  return (
    <div className={styles.root}>
      {/* --- Top 3 (The Architect Roster) --- */}
      <div className={styles.roster}>
        <div className={styles.rosterHead}>
          <span className={styles.rosterTitle}>Builders</span>
          <span className={styles.rosterHint}>Top {top3.length} Builders</span>
        </div>
        
        <div className={styles.featuredGrid}>
          {top3.map((b, i) => (
            <HeroCard
              key={b.handle}
              kind="builder"
              size={i === 0 ? "boss" : "featured"}
              avatar={
                <Link href={`/maker/${b.address}`} onClick={e => e.stopPropagation()} style={{ display: 'block', width: '100%', height: '100%' }}>
                  {b.avatarUrl
                    ? <img src={b.avatarUrl} alt={b.handle} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: i === 0 ? "24px" : "18px" }} />
                    : <BuilderFallbackAvatar handle={b.handle} size={i === 0 ? 140 : 100} radius={i === 0 ? 24 : 18} />}
                </Link>
              }
              name={<Link href={`/maker/${b.address}`} onClick={e => e.stopPropagation()}>@{b.handle}</Link>}
              tagline={b.topBot ? <span>Building <Link href={`/bot/${b.topBot.id}`} onClick={e => e.stopPropagation()}>{b.topBot.name}</Link> and {b.totalBots - 1} more.</span> : undefined}
              heroLabel="Avg. Brier"
              heroValue={b.avgBrier > 0 ? b.avgBrier.toFixed(3) : "—"}
              badge={
                <div className={`${styles.rankBadge} ${i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : styles.rank3}`}>
                  {i === 0 && <span className={styles.rankCrown}>👑</span>}
                  {i + 1}
                </div>
              }
              secondaryStats={[
                { label: "TVL", value: `$${b.globalTVL.toLocaleString()}` },
                { label: "Bots", value: `${b.liveBots}` },
              ]}
              accentColor={getBuilderColor(b.handle)}
              onClick={() => setExpanded(expanded === b.handle ? null : b.handle)}
            />
          ))}
        </div>
      </div>

      {/* --- Leaderboard Completo (CSS Grid, sin <table>) --- */}
      <div className={styles.standings}>
        <div className={styles.standingsTop}>
          <span className={styles.standingsTitle}>Full Builder Ranking</span>
          <span className={styles.rosterHint}>{ranked.length} builders</span>
        </div>
        
        <div className={styles.rows}>
          <div className={styles.rheadBuilder}>
            <span>#</span>
            <span>Builder</span>
            <span>Global TVL</span>
            <span>Avg. Brier</span>
            <span>Bots (Live)</span>
            <span>Top Bot</span>
          </div>

          {ranked.map((b, i) => {
            const isOpen = expanded === b.handle;
            return (
              <div 
                key={b.handle} 
                onMouseEnter={() => setExpanded(b.handle)}
                onMouseLeave={() => setExpanded(null)}
              >
                <div className={`${styles.rowBuilder} ${i === 0 ? styles.rowLead : ''}`}>
                  <span className={styles.rk}>{i + 1}</span>
                  <span className={styles.algo}>
                    <Link href={`/maker/${b.address}`} onClick={e => e.stopPropagation()} className={styles.rowFrame} style={{ textDecoration: 'none' }}>
                      {b.avatarUrl ? <img src={b.avatarUrl} style={{width:'100%', height:'100%', objectFit: 'cover'}} alt="" /> : <BuilderFallbackAvatar handle={b.handle} size={34} radius={8} />}
                    </Link>
                    <span className={styles.rname}>
                      <Link href={`/maker/${b.address}`} onClick={e => e.stopPropagation()}>@{b.handle}</Link>
                    </span>
                  </span>
                  <span className={styles.cell}>${b.globalTVL.toLocaleString()}</span>
                  <span className={`${styles.cell} ${styles.cellBrier}`}>{b.avgBrier.toFixed(3)}</span>
                  <span className={styles.cell}>{b.liveBots}</span>
                  <span className={styles.cell}>{b.topBot?.name ? <Link href={`/bot/${b.topBot.id}`} onClick={(e) => e.stopPropagation()}>{b.topBot.name}</Link> : "—"}</span>
                </div>

                <div className={`${styles.portfolioWrap} ${isOpen ? styles.portfolioOpen : styles.portfolioClosed}`}>
                  <div className={styles.portfolioInner}>
                    {b.bots.slice(0, 5).map((bot) => (
                      <div key={bot.id} className={styles.portfolioBot}>
                        <span className={`${styles.statusDot} ${styles[`statusDot${bot.status}`]}`} />
                        <span style={{color: '#fff', fontWeight: 600}}>{bot.name}</span> 
                        <span>— TVL ${bot.tvl.toLocaleString()}</span>
                        <span>— Brier {bot.brierScore.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

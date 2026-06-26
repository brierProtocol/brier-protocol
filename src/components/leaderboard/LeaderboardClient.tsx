'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BotIrisAvatar from '@/components/bot/BotIrisAvatar';
import { botEye, deriveAvatarColor } from '@/lib/bot-identity';
import styles from './Leaderboard.module.css';

const REVEAL_AT = 1050; // ms — el contenido se destapa cuando el swarm ya tapó la pantalla

/* ---------- helpers de datos (/api/bots) ---------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
function brierOf(b: any): number | null {
  const v = b?.scores?.[0]?.brierScore ?? b?.brierScore;
  return typeof v === 'number' && v > 0 ? v : null;
}
function wrOf(b: any): number | null {
  const v = b?.scores?.[0]?.winRate ?? b?.winRate;
  return typeof v === 'number' && v > 0 ? v : null;
}
function sharpeOf(b: any): number | null {
  const v = b?.scores?.[0]?.sharpe;
  return typeof v === 'number' && v > 0 ? v : null;
}
function tradesOf(b: any): number {
  return b?.scores?.[0]?.totalTrades ?? 0;
}
function tvlOf(b: any): number {
  return b?.currentTVL ?? b?.tvl ?? 0;
}
function lifetimeOf(b: any): string {
  if (!b?.createdAt) return '—';
  const d = Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 86_400_000);
  return d <= 0 ? '<1d' : `${d}d`;
}
function authorOf(b: any): string {
  if (b?.maker?.handle) return `@${b.maker.handle}`;
  if (b?.maker?.name) return b.maker.name;
  const w = b?.walletAddress || 'anon';
  return `${w.substring(0, 6)}…${w.length > 6 ? w.substring(w.length - 4) : ''}`;
}
function fmtTvl(n: number): string {
  if (!n) return '—';
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toLocaleString()}`;
}
function tierOf(brier: number | null): { label: string; color: string } | null {
  if (brier == null) return null;
  if (brier <= 0.15) return { label: 'ELITE', color: '#00d4aa' };
  if (brier <= 0.25) return { label: 'STRONG', color: '#37d67a' };
  if (brier <= 0.4) return { label: 'MOD', color: '#888' };
  return { label: 'WEAK', color: '#555' };
}

interface Sprite { bmp: HTMLCanvasElement; x: number; y: number; vx: number; vy: number; rot: number; vr: number; alpha: number; }

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// FNV-1a hash so a seed maps to a distinct creature (same scheme as BotIrisAvatar)
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

// A real bot avatar (the BotIrisAvatar pixel creature) rasterized into a sprite,
// so the intro swarm is literally a cloud of distinct agents with their own
// generative colors, not random noise. Mirrors the SVG creature algorithm.
function makeSprite(seed: number, cell: number) {
  const N = 10, half = 5;
  const accent = deriveAvatarColor(String(seed));
  const aLight = lighten(accent, 0.45);
  const rnd = mulberry32(hash(String(seed)));
  const on: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  for (let y = 1; y < N - 1; y++) for (let x = 0; x < half; x++) {
    const cx = (half - 1 - x) / half, cy = Math.abs(y - (N - 1) / 2) / ((N - 1) / 2);
    if (rnd() < 0.78 - cx * 0.45 - cy * 0.28) { on[y][x] = true; on[y][N - 1 - x] = true; }
  }
  const eyeRow = 2 + Math.floor(rnd() * 3);
  const eyeCol = 1 + Math.floor(rnd() * (half - 2));
  const ex1 = half - 1 - eyeCol, ex2 = N - 1 - ex1;
  on[eyeRow][ex1] = true; on[eyeRow][ex2] = true;
  if (eyeRow > 1) { on[eyeRow - 1][ex1] = true; on[eyeRow - 1][ex2] = true; }
  const c = document.createElement('canvas');
  c.width = N * cell; c.height = N * cell;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < N; y++) for (let x = 0; x < half; x++) {
    if (!on[y][x]) continue;
    g.fillStyle = rnd() < 0.28 ? aLight : accent;
    g.fillRect(x * cell, y * cell, cell, cell);
    g.fillRect((N - 1 - x) * cell, y * cell, cell, cell);
  }
  g.fillStyle = '#050505';
  g.fillRect(ex1 * cell + cell * 0.2, eyeRow * cell + cell * 0.2, cell * 0.6, cell * 0.6);
  g.fillRect(ex2 * cell + cell * 0.2, eyeRow * cell + cell * 0.2, cell * 0.6, cell * 0.6);
  return c;
}

export default function LeaderboardClient() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const swarmRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // live data: trae /api/bots y re-rankea cada 20s (the board breathes)
  useEffect(() => {
    const load = () =>
      fetch('/api/bots')
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setBots(d); })
        .catch(console.error)
        .finally(() => setLoading(false));
    load();
    const iv = setInterval(load, 20_000);
    return () => clearInterval(iv);
  }, []);

  // animación del swarm (decorativa: tapa y se disipa, revela el contenido debajo)
  const run = useCallback(() => {
    const root = rootRef.current, cv = swarmRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext('2d')!;
    cancelAnimationFrame(rafRef.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setRevealed(false);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = root.clientWidth, H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sprites: Sprite[] = [];
    for (let i = 0; i < 160; i++) {
      const cell = 2 + Math.floor(Math.random() * 2);
      sprites.push({
        bmp: makeSprite((Math.random() * 1e9) | 0, cell),
        x: Math.random() * W, y: H + 10 + Math.random() * 420,
        vx: (Math.random() - 0.5) * 1.4, vy: -(5.0 + Math.random() * 5.6),
        rot: 0, vr: (Math.random() - 0.5) * 0.14, alpha: 1,
      });
    }

    revealTimer.current = setTimeout(() => setRevealed(true), REVEAL_AT);

    let start = 0;
    const frame = (ts: number) => {
      if (!start) start = ts;
      const t = ts - start;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const s of sprites) {
        s.x += s.vx; s.y += s.vy; s.rot += s.vr;
        if (t > 900) s.vy -= 0.13;
        if (t > REVEAL_AT) s.alpha -= 0.02;
        if (s.alpha <= 0.02 || s.y < -60) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.bmp, -s.bmp.width / 2, -s.bmp.height / 2);
        ctx.restore();
      }
      if (alive > 0) rafRef.current = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    run();
    return () => { cancelAnimationFrame(rafRef.current); if (revealTimer.current) clearTimeout(revealTimer.current); };
  }, [run]);

  const ranked = [...bots].sort((a, b) => (brierOf(a) ?? 1) - (brierOf(b) ?? 1));
  const champion = ranked[0];
  const top5 = ranked.slice(0, 5);
  const rest = ranked.slice(5);

  const champBrier = champion ? brierOf(champion) : null;
  const champWr = champion ? wrOf(champion) : null;
  const tier = tierOf(champBrier);
  const champBrierBar = champBrier != null ? `${Math.round((1 - champBrier) * 100)}%` : '0%';
  const champWinBar = champWr != null ? `${Math.round(champWr * 100)}%` : '0%';

  const RANK_GEMS = ['oracle', 'prism', 'azure', 'ember', 'verdant'];
  const rankClasses = [styles.r1, styles.r2, styles.r3, styles.r4, styles.r5];

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [vs, setVs] = useState<{a:number;b:number;top:number;leader:string;aName:string;bName:string;aLeads:boolean} | null>(null);
  const metrics = rest.map((b) => ({ br: brierOf(b) ?? 1, wr: wrOf(b) ?? 0, sh: sharpeOf(b) ?? 0 }));
  const closestRival = (i: number) => {
    let best = -1, bd = Infinity;
    for (let j = 0; j < metrics.length; j++) {
      if (j === i) continue;
      const d = Math.abs(metrics[i].wr - metrics[j].wr) * 3 + Math.abs(metrics[i].br - metrics[j].br) * 1.5 + Math.abs(metrics[i].sh - metrics[j].sh) / 50;
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  };
  const onRowHover = (i: number) => {
    const j = closestRival(i); if (j < 0) return;
    const ea = rowRefs.current[i], eb = rowRefs.current[j];
    const top = ea && eb ? (ea.offsetTop + ea.offsetHeight/2 + eb.offsetTop + eb.offsetHeight/2)/2 : 0;
    const aLeads = metrics[i].br <= metrics[j].br;
    setVs({ a:i, b:j, top, leader: aLeads ? rest[i].name : rest[j].name, aName: rest[i].name, bName: rest[j].name, aLeads });
  };

  return (
    <div ref={rootRef} className={`${styles.root} ${revealed ? styles.rootRevealed : ''}`}>
      <div className={styles.glow} />

      <div className={`${styles.content} ${revealed ? styles.contentRevealed : ''}`}>
        <div className={`${styles.eyebrow} ${styles.reveal}`} style={{ transitionDelay: '.04s' }}>proving ground</div>
        <h1 className={`${styles.h1} ${styles.reveal}`} style={{ transitionDelay: '.09s' }}>
          Leaderboard<span className={styles.accent}>.</span>
        </h1>
        <p className={`${styles.lead} ${styles.reveal}`} style={{ transitionDelay: '.15s' }}>
          Ranked strictly by <b>Brier Score</b>. Lower is superior. Every score derives from resolved trades. Nothing is self reported.
        </p>

        {/* gem podium top 5 */}
        {top5.length > 0 && (
          <div className={`${styles.podium} ${styles.reveal}`} style={{ transitionDelay: '.20s' }}>
            {top5.map((b, i) => {
              const gem = RANK_GEMS[i];
              const slug = b.slug || b.id;
              const eye = botEye(b);
              const wr = wrOf(b);
              const isBoss = i === 0;
              return (
                <div
                  key={b.id}
                  className={`${styles.ptile} ${rankClasses[i] || ''} ${isBoss ? styles.ptileBoss : ''}`}
                  onClick={() => { window.location.href = `/bot/${slug}`; }}
                >
                  {isBoss && (
                    <span className={styles.ptileCrown}>
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="#c89bff" aria-hidden="true">
                        <path d="M3 7l4 4 5-7 5 7 4-4v11H3V7z" />
                        <rect x="3" y="20" width="18" height="2" />
                      </svg>
                    </span>
                  )}
                  <div
                    className={styles.gembadge}
                    style={{ ['--gemsrc' as string]: `url(/gems/${gem}.svg)` }}
                  >
                    <img src={`/gems/${gem}.svg`} alt={gem} />
                    <span className={styles.shine} />
                  </div>
                  <span className={styles.ptileRank}>{i + 1}</span>
                  <div className={styles.ptileAvatar}>
                    <BotIrisAvatar {...eye} size={isBoss ? 64 : 40} />
                  </div>
                  <div className={styles.ptileBottom}>
                    <span className={styles.ptileLabel}>{gem.toUpperCase()}</span>
                    <span className={styles.ptileName}>{b.name}</span>
                    {wr != null && <span className={styles.ptileWr}>WR {(wr * 100).toFixed(1)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* roster */}
        {ranked.length > 0 && (
          <div className={`${styles.roster} ${styles.reveal}`} style={{ transitionDelay: '.24s' }}>
            <div className={styles.rosterHead}>Select your fighter</div>
            <div className={styles.rosterGrid}>
              {ranked.map((b, i) => {
                const eye = botEye(b);
                const slug = b.slug || b.id;
                return (
                  <div
                    key={b.id}
                    className={`${styles.tile} ${i === 0 ? styles.boss : ''}`}
                    style={{ ['--tile-color' as string]: eye.accentColor }}
                    onClick={() => { window.location.href = `/bot/${slug}`; }}
                  >
                    {i === 0 && <span className={styles.crown}>♛</span>}
                    <div className={styles.tileFrame}>
                      <BotIrisAvatar {...eye} size={i === 0 ? 48 : 28} />
                    </div>
                    <div className={styles.tileName}>{b.name}</div>
                    <div className={styles.tileRank}>#{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* champion */}
        {champion && (
          <div className={`${styles.champ} ${styles.reveal}`} style={{ transitionDelay: '.34s' }}>
            <div className={styles.champTop}>
              <span className={styles.medal}>RANK 01</span>
              <div className={styles.heroFrame}>
                <BotIrisAvatar {...botEye(champion)} size={58} />
              </div>
              <div className={styles.champId}>
                <div className={styles.champName}>
                  {champion.name}
                  {tier && <span className={styles.tier} style={{ color: tier.color, background: `${tier.color}14`, border: `1px solid ${tier.color}33` }}>{tier.label}</span>}
                </div>
                <div className={styles.champBy}>by {authorOf(champion)}</div>
              </div>
              <div className={styles.live}><span className={styles.liveDot} />LIVE</div>
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statK}>Brier</div>
                <div className={`${styles.statV} ${styles.statVRed}`}>{champBrier != null ? champBrier.toFixed(3) : 'AWAITING'}</div>
                <div className={styles.bar}><span className={styles.barFill} style={{ ['--w' as string]: champBrierBar }} /></div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statK}>Win rate</div>
                <div className={styles.statV}>{champWr != null ? `${(champWr * 100).toFixed(1)}%` : '—'}</div>
                <div className={styles.bar}><span className={styles.barFill} style={{ ['--w' as string]: champWinBar }} /></div>
              </div>
              <div className={styles.stat}><div className={styles.statK}>TVL vault</div><div className={styles.statV}>{fmtTvl(tvlOf(champion))}</div></div>
              <div className={styles.stat}><div className={styles.statK}>Trades</div><div className={styles.statV}>{tradesOf(champion) || '—'}</div></div>
              <div className={styles.stat}><div className={styles.statK}>Lifetime</div><div className={styles.statV}>{lifetimeOf(champion)}</div></div>
              <div className={styles.stat}><div className={styles.statK}>Sharpe</div><div className={styles.statV}>{sharpeOf(champion) != null ? sharpeOf(champion)!.toFixed(2) : '—'}</div></div>
            </div>
          </div>
        )}

        {/* rows — rank 6+ */}
        {!loading && rest.length === 0 ? (
          <div className={`${styles.standingsMore} ${styles.reveal}`} style={{ transitionDelay: '.42s' }}>
            more bots coming soon
          </div>
        ) : (
        <div className={`${styles.rows} ${styles.reveal}`} style={{ transitionDelay: '.42s' }} onMouseLeave={() => setVs(null)}>
          {!loading && rest.length > 0 && (
            <div className={styles.standingsHead}>The standings</div>
          )}
          <div className={styles.rhead}>
            <span>#</span><span>Algorithm</span><span>Brier</span><span>Win rate</span><span>TVL</span><span>Trades</span><span>Lifetime</span><span>Sharpe</span>
          </div>
          {loading ? (
            <div className={styles.empty}>&gt; syncing on-chain data…</div>
          ) : (
            rest.map((b, i) => {
              const slug = b.slug || b.id;
              const br = brierOf(b);
              const n = tradesOf(b);
              return (
                <div key={b.id} ref={(el) => { rowRefs.current[i] = el; }} className={`${styles.row} ${vs && vs.a === i ? styles.rowActive : ''} ${vs && vs.b === i ? styles.rowRival : ''}`} onMouseEnter={() => onRowHover(i)} onClick={() => { window.location.href = `/bot/${slug}`; }}>
                  <span className={styles.rk}>{i + 6}</span>
                  <span className={styles.algo}>
                    <span className={styles.rowFrame}><BotIrisAvatar {...botEye(b)} size={32} /></span>
                    <span>
                      <span className={styles.rname}><Link href={`/bot/${slug}`} onClick={(e) => e.stopPropagation()}>{b.name}</Link></span>
                      <br /><span className={styles.rby}>by {authorOf(b)}</span>
                    </span>
                  </span>
                  <span className={styles.cell}>{br != null ? br.toFixed(3) : 'AWAITING'}</span>
                  <span className={styles.cell}>{wrOf(b) != null ? `${(wrOf(b)! * 100).toFixed(1)}%` : '—'}</span>
                  <span className={styles.cell}>{fmtTvl(tvlOf(b))}</span>
                  <span className={styles.cell}>{n > 0 ? n.toLocaleString() : '—'}{n > 0 && n < 50 && <span className={styles.lowN}>LOW N</span>}</span>
                  <span className={styles.cell}>{lifetimeOf(b)}</span>
                  <span className={styles.cell}>{sharpeOf(b) != null ? sharpeOf(b)!.toFixed(2) : '—'}</span>
                </div>
              );
            })
          )}
          {vs && (
            <div className={styles.vsBadge} style={{ top: vs.top }}>
              <span className={vs.aLeads ? styles.vsUp : styles.vsDn}>{vs.aName}</span>
              <span className={styles.vsMark}>VS</span>
              <span className={vs.aLeads ? styles.vsDn : styles.vsUp}>{vs.bName}</span>
              <span className={styles.vsLead}>· {vs.leader} leads</span>
            </div>
          )}
        </div>
        )}

        {/* explainer */}
        <div className={`${styles.exp} ${styles.reveal}`} style={{ transitionDelay: '.5s' }}>
          <div className={styles.expHead}>
            <h3>The Brier Score<span className={styles.accent}>.</span></h3>
            <span className={styles.expTag}>how ranking works</span>
          </div>
          <p className={styles.expBody}>
            A Brier Score measures how accurate a probabilistic forecast is. It is the mean squared error between the probability a bot assigns to an outcome and what actually resolves. The scale runs from <b>0</b> to <b>1</b>. A flawless forecaster scores <b>0</b>. A coin flip lands near <b>0.25</b>. On Brier, the lowest score ranks first.
          </p>
          <div className={styles.formula}>BS = (1/N) Σ (pᵢ − oᵢ)² <span className={styles.formulaMut}>// p = forecast, o = outcome</span></div>
          <div className={styles.scaleWrap}>
            <div className={styles.track}>
              <div className={styles.mark} style={{ left: '0%' }} />
              <div className={`${styles.mlbl} ${styles.mlblBot}`} style={{ left: '0%', transform: 'translateX(0)' }}>0.00 · perfect</div>
              <div className={styles.mark} style={{ left: '25%' }} />
              <div className={`${styles.mlbl} ${styles.mlblBot}`} style={{ left: '25%' }}>0.25 · coin flip</div>
              {champBrier != null && (
                <>
                  <div className={`${styles.mark} ${styles.markAdan}`} style={{ left: `${Math.min(100, champBrier * 100)}%` }} />
                  <div className={`${styles.mlbl} ${styles.mlblTop} ${styles.mlblAdan}`} style={{ left: `${Math.min(100, champBrier * 100)}%` }}>{champion.name} {champBrier.toFixed(3)}</div>
                </>
              )}
              <div className={styles.mark} style={{ left: '100%' }} />
              <div className={`${styles.mlbl} ${styles.mlblBot}`} style={{ left: '100%', transform: 'translateX(-100%)' }}>1.00 · worst</div>
            </div>
          </div>
        </div>

        {/* trust grid */}
        <div className={`${styles.trust} ${styles.reveal}`} style={{ transitionDelay: '.58s' }}>
          <div className={styles.tcard}><div className={styles.ic}>/&gt;</div><h4>Math enforcement</h4><p>Rankings derived from the Brier Score, the gold standard in forecasting.</p></div>
          <div className={styles.tcard}><div className={styles.ic}>{'{}'}</div><h4>Verified fills</h4><p>Every score traces back to resolved market outcomes. No self reporting.</p></div>
          <div className={styles.tcard}><div className={styles.ic}>[]</div><h4>Zero trust</h4><p>HMAC-SHA256 signed signals. Resolution state cannot be altered.</p></div>
        </div>
      </div>

      <canvas ref={swarmRef} className={styles.swarm} />
      <button className={styles.replay} onClick={run} type="button">↺ replay</button>
    </div>
  );
}

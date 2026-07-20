'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BotIrisAvatar from '@/components/bot/BotIrisAvatar';
import { botEye, deriveAvatarColor } from '@/lib/botIdentity';
import HeroCard from './HeroCard';
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
// Reputation = LCB of skill vs the market (0..100). This is the anti-luck metric
// the engine graduates on — a handful of lucky calls cannot inflate it. Ranking
// on THIS instead of raw Brier stops a 3-call bot from topping the board.
function repOf(b: any): number | null {
  const v = b?.scores?.[0]?.reputationScore ?? b?.reputationScore;
  return typeof v === 'number' ? v : null;
}
// Minimum resolved predictions before a bot is trustworthy enough to be ranked
// among the proven — mirrors the skill engine's MIN_RANKED_N.
const MIN_RANKED = 30;
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

// Cara del bot: la foto real (pfpUrl) si la subió, si no el alien generado.
// Mantiene el mismo tamaño/encuadre que el BotIrisAvatar para no romper el layout.
function BotFace({ bot, size }: { bot: any; size: number }) {
  if (bot?.pfpUrl) {
    return (
      <img
        src={bot.pfpUrl}
        alt={bot?.name || 'bot'}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8, display: 'block' }}
      />
    );
  }
  return <BotIrisAvatar {...botEye(bot)} size={size} bg="transparent" />;
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

const SHADOW_THRESHOLD = 100; // Bots need 100 trades to get out of shadow mode

export function getBotTag(brier: number | null, trades: number) {
  if (trades < SHADOW_THRESHOLD) return { label: "Shadow Mode", color: "#888", bg: "#1a1a1a", border: "#333" };
  if (brier == null) return { label: "Shadow Mode", color: "#888", bg: "#1a1a1a", border: "#333" };
  if (brier <= 0.15) return { label: "Elite", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" };
  if (brier <= 0.20) return { label: "Solid", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" };
  if (brier <= 0.25) return { label: "Unproven", color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.2)" };
  return { label: "High Risk", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" };
}

export default function LeaderboardClient() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [brierOpen, setBrierOpen] = useState(false);

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

  // Rank by REPUTATION (LCB skill vs market), the anti-luck metric — not raw
  // Brier, which a lucky handful of calls can top. Bots with enough resolved
  // predictions AND a reputation score rank first (by reputation desc); the
  // rest fall below, ordered by raw Brier. This is what keeps the podium honest.
  const isRanked = (b: any) => repOf(b) != null && tradesOf(b) >= MIN_RANKED;
  const ranked = [...bots].sort((a, b) => {
    const ra = isRanked(a), rb = isRanked(b);
    if (ra && rb) return (repOf(b) ?? 0) - (repOf(a) ?? 0); // higher reputation first
    if (ra !== rb) return ra ? -1 : 1;                      // proven bots above unproven
    return (brierOf(a) ?? 1) - (brierOf(b) ?? 1);           // else lowest Brier first
  });
  const champion = ranked[0];
  // La tabla de abajo es el leaderboard completo: TODOS los agentes en fila,
  // pensado para escalar a decenas/cientos. Los principales además se ven
  // grandes arriba en el roster.
  const rest = ranked;

  const champBrier = champion ? brierOf(champion) : null;

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
        <p className={`${styles.lead} ${styles.reveal}`} style={{ transitionDelay: '.15s', marginTop: -20, textAlign: 'center', maxWidth: '100%' }}>
          Ranked strictly by <b>Brier Score</b>. Lower is superior. Every score derives from resolved trades. Nothing is self reported.
        </p>

        {/* explainer — botón desplegable interactivo: cerrado por defecto, no satura;
            quien quiere entender el ranking lo abre. */}
        <div className={`${styles.exp} ${styles.reveal} ${brierOpen ? styles.expOpen : ''}`} style={{ transitionDelay: '.18s' }}>
          <button type="button" className={styles.expToggle} onClick={() => setBrierOpen(o => !o)} aria-expanded={brierOpen}>
            <span className={styles.expQ}>?</span>
            <span className={styles.expToggleText}>What is the Brier Score<span className={styles.accent}>?</span></span>
            <span className={styles.expToggleHint}>{brierOpen ? 'hide' : 'how ranking works'}</span>
            <span className={styles.expChevron}>⌄</span>
          </button>
          <div className={styles.expPanel} aria-hidden={!brierOpen}>
            <div className={styles.expPanelInner}>
              <p className={styles.expBody}>
                Every bot here is a forecaster. It does not just say &ldquo;yes&rdquo; or &ldquo;no&rdquo;, it says how sure it is, like &ldquo;70% chance&rdquo;. The <b>Brier Score</b> grades those calls against what actually happened: confident and right scores low, confident and wrong scores high. It runs from <b>0</b> to <b>1</b>. A perfect forecaster scores <b>0</b>. A pure coin flip lands near <b>0.25</b>. <b>Lower is better, so the lowest score ranks #1.</b> No one can fake it, the score only comes from trades that already resolved on-chain.
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
          </div>
        </div>

        {/* roster — character select: las caras de los bots dominan, grandes. */}
        {ranked.length > 0 && (
          <div className={`${styles.roster} ${styles.reveal}`} style={{ transitionDelay: '.20s' }}>
            <div className={styles.rosterHead}>
              <h3 className="font-sans text-[22px] md:text-[24px] font-bold text-white m-0 tracking-[-0.02em]">Best Bots<span className="text-primary">.</span></h3>
              <span className={styles.rosterHint}>{ranked.length} agents · ranked by Brier</span>
            </div>
            <div className={styles.featuredGrid}>
              {ranked.slice(0, 3).map((b, i) => {
                const slug = b.slug || b.id;
                const br = brierOf(b);
                const wr = wrOf(b);
                
                return (
                  <HeroCard
                    key={b.id}
                    kind="agent"
                    size={i === 0 ? "boss" : "featured"}
                    avatar={<BotFace bot={b} size={i === 0 ? 140 : 100} />}
                    name={b.name}
                    tagline={`by ${authorOf(b)}`}
                    heroLabel="Brier"
                    heroValue={br != null ? br.toFixed(3) : "—"}
                    badge={
                      <div className={`${styles.rankBadge} ${i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : styles.rank3}`}>
                        {i === 0 && <span className={styles.rankCrown}>👑</span>}
                        {i + 1}
                      </div>
                    }
                    secondaryStats={[
                      { label: "Win Rate", value: wr != null ? `${(wr * 100).toFixed(1)}%` : "—" },
                      { label: "Trades", value: tradesOf(b).toString() }
                    ]}
                    accentColor={botEye(b).accentColor}
                    footer={
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                        {(() => {
                          const tag = getBotTag(br, tradesOf(b));
                          return (
                            <span style={{ 
                              color: tag.color, 
                              backgroundColor: tag.bg, 
                              border: `1px solid ${tag.border}`,
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                              textTransform: 'uppercase'
                            }}>
                              {tag.label}
                            </span>
                          );
                        })()}
                      </div>
                    }
                    onClick={() => { window.location.href = `/bot/${slug}`; }}
                  />
                );
              })}
            </div>
          </div>
        )}


        {/* leaderboard completo: todos los agentes en fila, escala a cientos */}
        <div className={`${styles.standings} ${styles.reveal}`} style={{ transitionDelay: '.34s' }}>
          <div className={styles.standingsTop}>
            <h3 className="font-sans text-[22px] md:text-[24px] font-bold text-white m-0 tracking-[-0.02em]">Full Leaderboard<span className="text-primary">.</span></h3>
            {!loading && rest.length > 0 && (
              <span className={styles.rosterHint}>{rest.length} {rest.length === 1 ? 'agent' : 'agents'} · live ranking</span>
            )}
          </div>
          <div className={`${styles.rows}`} onMouseLeave={() => setVs(null)}>
            <div className={styles.rhead}>
              <span>#</span><span>Agent</span><span className="text-primary font-bold">Brier</span><span>Win rate</span><span>Net PnL</span><span>Trades</span><span>Lifetime</span><span>Sharpe</span>
            </div>
            {loading ? (
              <div className={styles.empty}>&gt; syncing on-chain data…</div>
            ) : rest.length === 0 ? (
              <div className={styles.empty}>No agents have resolved trades yet.</div>
            ) : (
              rest.map((b, i) => {
                const slug = b.slug || b.id;
                const br = brierOf(b);
                const n = tradesOf(b);
                return (
                  <div key={b.id} ref={(el) => { rowRefs.current[i] = el; }} className={`${styles.row} ${i === 0 ? styles.rowLead : ''} ${vs && vs.a === i ? styles.rowActive : ''} ${vs && vs.b === i ? styles.rowRival : ''}`} onMouseEnter={() => onRowHover(i)} onClick={() => { window.location.href = `/bot/${slug}`; }}>
                    <span className={styles.rk}>{i + 1}</span>
                    <span className={styles.algo}>
                      <span className={styles.rowFrame}><BotFace bot={b} size={34} /></span>
                      <span>
                        <span className={styles.rname}><Link href={`/bot/${slug}`} onClick={(e) => e.stopPropagation()}>{b.name}</Link></span>
                        <br />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={styles.rby}>by {authorOf(b)}</span>
                          {(() => {
                            const tag = getBotTag(br, n);
                            return (
                              <span style={{ 
                                color: tag.color, 
                                backgroundColor: tag.bg, 
                                border: `1px solid ${tag.border}`,
                                padding: '2px 6px', 
                                borderRadius: '8px', 
                                fontSize: '9px', 
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                lineHeight: 1
                              }}>
                                {tag.label}
                              </span>
                            );
                          })()}
                        </span>
                      </span>
                    </span>
                    <span className={`${styles.cell} ${styles.cellBrier}`}>{br != null ? br.toFixed(3) : 'AWAITING'}</span>
                    <span className={styles.cell}>{wrOf(b) != null ? `${(wrOf(b)! * 100).toFixed(1)}%` : '—'}</span>
                    <span className={styles.cell} style={{ color: '#888', fontSize: '10px', letterSpacing: '0.5px' }}>
                      {n >= SHADOW_THRESHOLD ? 'AWAITING VAULT' : '—'}
                    </span>
                    <span className={styles.cell}>{n > 0 ? n.toLocaleString() : '—'}{n > 0 && n < 100 && <span className={styles.lowN}>LOW N</span>}</span>
                    <span className={styles.cell}>{lifetimeOf(b)}</span>
                    <span className={styles.cell}>{sharpeOf(b) != null ? sharpeOf(b)!.toFixed(2) : '—'}</span>
                  </div>
                );
              })
            )}
            {vs && (
              <div className={styles.vsBadge} style={{ top: vs.top }}>
                <span className={styles.vsUp}>{vs.aName}</span>
                <span className={styles.vsMark}>VS</span>
                <span className={styles.vsUp}>{vs.bName}</span>
              </div>
            )}
          </div>
        </div>

        {/* por qué confiar en este ranking — tres pilares, lenguaje claro */}
        <div className={`${styles.trust} ${styles.reveal}`} style={{ transitionDelay: '.46s' }}>
          <div className={styles.trustHead}>Why this ranking is honest</div>
          <div className={styles.trustGrid}>
            <div className={styles.tcard}>
              <div className={styles.tnum}>01</div>
              <h4>Graded by math</h4>
              <p>Every rank comes from the Brier Score, the same metric used to grade professional forecasters. No opinions, no committee.</p>
            </div>
            <div className={styles.tcard}>
              <div className={styles.tnum}>02</div>
              <h4>Settled on-chain</h4>
              <p>A score only counts after the market it bet on actually resolved on-chain. Open trades never inflate the number.</p>
            </div>
            <div className={styles.tcard}>
              <div className={styles.tnum}>03</div>
              <h4>Impossible to fake</h4>
              <p>Signals are signed and outcomes are public. No agent can edit its own history or self report a single result.</p>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={swarmRef} className={styles.swarm} />
      <button className={styles.replay} onClick={run} type="button">↺ replay</button>
    </div>
  );
}

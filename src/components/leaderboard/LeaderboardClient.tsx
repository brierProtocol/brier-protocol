'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BotIrisAvatar from '@/components/bot/BotIrisAvatar';
import { botEye } from '@/lib/botIdentity';
import styles from './Leaderboard.module.css';

const PALETTE = ['#FF2A4D', '#FF5570', '#ffffff', '#d63a54', '#ff8095'];
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
function makeSprite(seed: number, cell: number, color: string) {
  const cols = 7, rows = 7, half = 4, rnd = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = cols * cell; c.height = rows * cell;
  const x = c.getContext('2d')!;
  for (let r = 0; r < rows; r++) for (let q = 0; q < half; q++) {
    if (rnd() > 0.45) { x.fillStyle = color; x.fillRect(q * cell, r * cell, cell, cell); x.fillRect((cols - 1 - q) * cell, r * cell, cell, cell); }
  }
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
    for (let i = 0; i < 150; i++) {
      const cell = 2 + Math.floor(Math.random() * 3);
      sprites.push({
        bmp: makeSprite((i * 9973 + 17) | 0, cell, PALETTE[(Math.random() * PALETTE.length) | 0]),
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
  const rest = ranked.slice(1);

  const champBrier = champion ? brierOf(champion) : null;
  const champWr = champion ? wrOf(champion) : null;
  const tier = tierOf(champBrier);
  const champBrierBar = champBrier != null ? `${Math.round((1 - champBrier) * 100)}%` : '0%';
  const champWinBar = champWr != null ? `${Math.round(champWr * 100)}%` : '0%';

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

        {/* rows */}
        <div className={`${styles.rows} ${styles.reveal}`} style={{ transitionDelay: '.42s' }}>
          <div className={styles.rhead}>
            <span>#</span><span>Algorithm</span><span>Brier</span><span>Win rate</span><span>TVL</span><span>Trades</span><span>Lifetime</span><span>Sharpe</span>
          </div>
          {loading ? (
            <div className={styles.empty}>&gt; syncing on-chain data…</div>
          ) : rest.length === 0 ? (
            <div className={styles.empty}>&gt; no challengers yet. be the next to deploy.</div>
          ) : (
            rest.map((b, i) => {
              const slug = b.slug || b.id;
              const br = brierOf(b);
              const n = tradesOf(b);
              return (
                <div key={b.id} className={styles.row} onClick={() => { window.location.href = `/bot/${slug}`; }}>
                  <span className={styles.rk}>{i + 2}</span>
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
        </div>

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

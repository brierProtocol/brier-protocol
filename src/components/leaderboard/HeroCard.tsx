"use client";

import styles from "./Leaderboard.module.css";
import { formatMomentum } from "@/lib/momentum";
import React from "react";

interface HeroCardProps {
  kind: "agent" | "builder";
  avatar: React.ReactNode;
  name: React.ReactNode;
  tagline?: React.ReactNode;
  heroLabel: string;
  heroValue: string;
  secondaryStats: { label: string; value: React.ReactNode }[];
  delta24h?: number;
  badge?: React.ReactNode;
  size?: "normal" | "featured" | "boss";
  accentColor?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
}

export default function HeroCard({
  kind, avatar, name, tagline, heroLabel, heroValue, secondaryStats, delta24h, badge, size = "normal", accentColor, onClick, footer
}: HeroCardProps) {
  const momentum = formatMomentum(delta24h);

  return (
    <div
      className={`${styles.heroCard} ${kind === "agent" ? styles.heroCardAgent : styles.heroCardBuilder} ${size === "boss" ? styles.heroCardBoss : size === "featured" ? styles.heroCardFeatured : ""}`}
      style={{ '--edge-color': accentColor } as React.CSSProperties}
      onClick={onClick}
    >
      <div className={styles.heroCardTop}>
        <div className={styles.heroAvatar}>{avatar}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', position: 'absolute', top: 16, right: 16 }}>
          {momentum && (
            <span className={`${styles.momentum} ${momentum.positive ? styles.momentumUp : styles.momentumDown}`}>
              {momentum.text}
            </span>
          )}
          {badge && <div className={styles.heroBadge}>{badge}</div>}
        </div>
      </div>

      <div className={styles.heroName}>{name}</div>
      {tagline && <div className={styles.heroTagline}>{tagline}</div>}

      <div className={styles.heroMain}>
        <span className={styles.heroValue}>{heroValue}</span>
        <span className={styles.heroLabel}>{heroLabel}</span>
      </div>

      <div className={styles.heroSecondary}>
        {secondaryStats.map((s) => (
          <div key={s.label} className={styles.secondaryStat}>
            <span className={styles.secondaryValue}>{s.value}</span>
            <span className={styles.secondaryLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {footer && <div className={styles.heroFooter}>{footer}</div>}
    </div>
  );
}

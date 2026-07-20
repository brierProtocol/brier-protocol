"use client";

import BuildersWrapper from "@/components/leaderboard/BuildersWrapper";
import styles from "@/components/leaderboard/Leaderboard.module.css";

export default function LeaderboardPage() {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Builders Leaderboard</h1>
        <p className={styles.pageSubtitle}>The sharpest quants, developers, and data scientists on Brier Protocol.</p>
      </div>

      <BuildersWrapper />
    </div>
  );
}

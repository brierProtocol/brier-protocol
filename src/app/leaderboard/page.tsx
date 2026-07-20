"use client";

import { useState } from "react";
import LeaderboardClient from "@/components/leaderboard/LeaderboardClient";
import BuildersWrapper from "@/components/leaderboard/BuildersWrapper";
import styles from "@/components/leaderboard/Leaderboard.module.css";

export default function LeaderboardPage() {
  const [view, setView] = useState<"agents" | "builders">("agents");

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div className={styles.pageHeader} style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 className="m-0 font-sans font-extrabold tracking-[-0.035em] leading-[1.0] text-[clamp(34px,4.8vw,56px)] text-white">
          Leaderboard<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#9a9a9a] max-w-xl mx-auto">The most accurate financial intelligence on Brier Protocol.</p>
      </div>

      <div 
        style={{ 
          display: "flex", 
          justifyContent: "center",
          marginBottom: 16,
          position: "relative",
          zIndex: 100
        }}
      >
        <div style={{
          display: "inline-flex", 
          gap: 4, 
          background: "rgba(255,255,255,0.05)", 
          padding: 4, 
          borderRadius: 20, 
          border: "1px solid #27272c",
          backdropFilter: "blur(8px)"
        }}>
          <button 
            onClick={() => setView("agents")}
            style={{ 
              padding: "6px 16px", 
              borderRadius: 16, 
              border: "none", 
              background: view === "agents" ? "#FF2A4D" : "transparent", 
              color: view === "agents" ? "#fff" : "#cfcfd4", 
              fontWeight: 600, 
              fontSize: 13, 
              cursor: "pointer", 
              transition: "all 0.2s",
              fontFamily: "'Space Grotesk', system-ui, sans-serif"
            }}
          >
            Agents
          </button>
          <button 
            onClick={() => setView("builders")}
            style={{ 
              padding: "6px 16px", 
              borderRadius: 16, 
              border: "none", 
              background: view === "builders" ? "#FF2A4D" : "transparent", 
              color: view === "builders" ? "#fff" : "#cfcfd4", 
              fontWeight: 600, 
              fontSize: 13, 
              cursor: "pointer", 
              transition: "all 0.2s",
              fontFamily: "'Space Grotesk', system-ui, sans-serif"
            }}
          >
            Builders
          </button>
        </div>
      </div>

      {view === "agents" ? <LeaderboardClient /> : <BuildersWrapper />}
    </div>
  );
}

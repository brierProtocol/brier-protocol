"use client";

import { useEffect, useState } from "react";
import BuildersClient from "./BuildersClient";
import { groupBotsByBuilder, type Builder } from "@/lib/builderScore";

export default function BuildersWrapper() {
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetch("/api/bots")
        .then((res) => res.json())
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            setBuilders(groupBotsByBuilder(data));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    
    load();
    // Actualizar cada 20s para mantenerlo en vivo como el Leaderboard de bots
    const iv = setInterval(load, 20_000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return (
      <div style={{ color: "#cfcfd4", padding: "120px 0", textAlign: "center", fontFamily: "monospace" }}>
        &gt; syncing builder data on-chain...
      </div>
    );
  }

  if (builders.length === 0) {
    return (
      <div style={{ color: "#cfcfd4", padding: "120px 0", textAlign: "center", fontFamily: "monospace" }}>
        No builders found.
      </div>
    );
  }

  return <BuildersClient builders={builders} />;
}

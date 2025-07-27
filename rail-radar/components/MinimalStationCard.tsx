"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTheme } from "next-themes";

interface MinimalStationCardProps {
  station: {
    _id: string;
    station_id: string;
    name: string;
    lat: number;
    lon: number;
  };
}

export function MinimalStationCard({ station }: MinimalStationCardProps) {
  const inspectorScore = useQuery(api.stations.getInspectorScore, { station_id: station.station_id });
  const { resolvedTheme } = useTheme();

  // Radial gradient glassmorphism background
  let tint = 'rgba(24,24,27,0.7)';
  if (inspectorScore && typeof inspectorScore.score === "number") {
    const score = inspectorScore.score;
    function lerpColor(a: number[], b: number[], t: number) {
      return a.map((v, i) => Math.round(v + (b[i] - v) * t));
    }
    const green = [34, 197, 94];
    const yellow = [234, 179, 8];
    const red = [239, 68, 68];
    let rgb;
    if (score < 0.5) {
      rgb = lerpColor(green, yellow, score / 0.5);
    } else {
      rgb = lerpColor(yellow, red, (score - 0.5) / 0.5);
    }
    tint = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`;
  }
  
  // Card border/shadow style only
  let cardStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
    borderRadius: '1rem',
    overflow: 'hidden',
    background: 'transparent',
  };
  
  // Blurred gradient background style
  let blurBgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    background: `radial-gradient(circle at 50% 50%, ${tint} 0%, rgba(24,24,27,0.10) 80%, rgba(24,24,27,0.0) 100%)`,
    filter: 'blur(24px)',
    pointerEvents: 'none',
  };

  return (
    <div
      className="relative rounded-2xl p-4 touch-target transition-colors duration-500 shadow-xl border border-border/10"
      style={cardStyle}
    >
      <div style={blurBgStyle} />
      <div className="relative z-10">
        <h3 className="font-semibold text-base text-foreground truncate">
          {station.name}
        </h3>
      </div>
    </div>
  );
} 
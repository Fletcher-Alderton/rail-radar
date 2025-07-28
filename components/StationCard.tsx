"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { useTheme } from "next-themes";

interface StationCardProps {
  station: {
    _id: string;
    station_id: string;
    name: string;
    lat: number;
    lon: number;
    thumbsUp: number;
    thumbsDown: number;
    totalVotes: number;
    isFavorite: boolean;
  };
}

export function StationCard({ station }: StationCardProps) {
  const submitVote = useMutation(api.stations.submitVote);
  const addFavorite = useMutation(api.stations.addFavorite);
  const removeFavorite = useMutation(api.stations.removeFavorite);
  const inspectorScore = useQuery(api.stations.getInspectorScore, { station_id: station.station_id });
  const [isVoting, setIsVoting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const iconSuffix = resolvedTheme === 'dark' ? 'white' : 'black';

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
  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
    borderRadius: '1rem',
    overflow: 'hidden',
    background: 'transparent',
  };
  // Blurred gradient background style
  const blurBgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    background: `radial-gradient(circle at 50% 50%, ${tint} 0%, rgba(24,24,27,0.10) 80%, rgba(24,24,27,0.0) 100%)`,
    filter: 'blur(24px)',
    pointerEvents: 'none',
  };

  const handleVote = async (voteType: boolean) => {
    setIsVoting(true);
    setError(null);
    
    try {
      await submitVote({
        station_id: station.station_id,
        vote_type: voteType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleFavorite = async () => {
    setIsFavoriting(true);
    setError(null);
    
    try {
      if (station.isFavorite) {
        await removeFavorite({ stationId: station.station_id });
      } else {
        await addFavorite({ stationId: station.station_id });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update favorite");
    } finally {
      setIsFavoriting(false);
    }
  };

  return (
    <div
      className="relative rounded-2xl p-4 touch-target transition-colors duration-500 shadow-xl border border-border/10"
      style={cardStyle}
    >
      <div style={blurBgStyle} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-foreground truncate">
              {station.name}
            </h3>
          </div>
          <button
            onClick={handleFavorite}
            disabled={isFavoriting}
            className="ml-3 p-2 rounded-full hover:bg-secondary/60 transition-colors disabled:opacity-50"
            title={station.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <img
              src={station.isFavorite ? `/icons/star.fill.${iconSuffix}.svg` : `/icons/star.${iconSuffix}.svg`}
              alt={station.isFavorite ? "Remove from favorites" : "Add to favorites"}
              width={24}
              height={24}
              className={station.isFavorite ? "text-yellow-400" : "text-muted-foreground"}
              style={{ filter: station.isFavorite ? undefined : 'grayscale(1) opacity(0.7)' }}
              draggable="false"
            />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-secondary/70 hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src={`/icons/exclamationmark.triangle.${iconSuffix}.svg`}
              alt="Report issue"
              width={24}
              height={24}
              draggable="false"
            />
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-secondary/70 hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src={`/icons/checkmark.circle.${iconSuffix}.svg`}
              alt="Mark as good"
              width={24}
              height={24}
              draggable="false"
            />
          </button>
        </div>
        
        {error && (
          <div className="mt-3 p-2 bg-secondary border border-border rounded text-sm text-foreground">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 
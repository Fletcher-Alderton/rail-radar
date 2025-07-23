"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";

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

  // Compute background color based on inspector score
  let bgColor = "#18181b"; // fallback to your default card color
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
    bgColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

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
      className="border border-border rounded-lg p-4 touch-target transition-colors duration-500"
      style={inspectorScore && typeof inspectorScore.score === "number" ? { backgroundColor: bgColor } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground truncate">
            {station.name}
          </h3>
        </div>
        <button
          onClick={handleFavorite}
          disabled={isFavoriting}
          className="ml-3 p-2 rounded-full hover:bg-secondary transition-colors disabled:opacity-50"
          title={station.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star 
            fill={station.isFavorite ? "currentColor" : "none"}
            className={`w-5 h-5 transition-colors ${
              station.isFavorite 
                ? "text-foreground" 
                : "text-muted-foreground"
            }`} 
          />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleVote(true)}
          disabled={isVoting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => handleVote(false)}
          disabled={isVoting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
      </div>
      
      {error && (
        <div className="mt-3 p-2 bg-secondary border border-border rounded text-sm text-foreground">
          {error}
        </div>
      )}
    </div>
  );
} 
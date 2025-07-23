"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";

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



  return (
    <div
      className="border border-border rounded-lg p-4 touch-target transition-colors duration-500"
      style={inspectorScore && typeof inspectorScore.score === "number" ? { backgroundColor: bgColor } : undefined}
    >
      <h3 className="font-semibold text-base text-foreground truncate">
        {station.name}
      </h3>
    </div>
  );
} 
"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

interface StationCardProps {
  station: {
    _id: string;
    station_id: string;
    station_name: string;
    station_lat: number;
    station_lon: number;
    thumbsUp: number;
    thumbsDown: number;
    totalVotes: number;
  };
}

export function StationCard({ station }: StationCardProps) {
  const submitVote = useMutation(api.stations.submitVote);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const getStatusColor = () => {
    if (station.totalVotes === 0) return "text-gray-500";
    if (station.thumbsUp > station.thumbsDown) return "text-green-600";
    if (station.thumbsDown > station.thumbsUp) return "text-red-600";
    return "text-yellow-600";
  };

  const getStatusText = () => {
    if (station.totalVotes === 0) return "No recent reports";
    if (station.thumbsUp > station.thumbsDown) return "Likely clear";
    if (station.thumbsDown > station.thumbsUp) return "Inspectors reported";
    return "Mixed reports";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            {station.station_name}
          </h3>
          <p className={`text-sm mt-1 ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {station.totalVotes} report{station.totalVotes !== 1 ? 's' : ''} in the last hour
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-green-600 dark:text-green-400 text-xl">👍</span>
            <span className="font-medium text-green-700 dark:text-green-300">
              {station.thumbsUp}
            </span>
          </button>
          
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-red-600 dark:text-red-400 text-xl">👎</span>
            <span className="font-medium text-red-700 dark:text-red-300">
              {station.thumbsDown}
            </span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 
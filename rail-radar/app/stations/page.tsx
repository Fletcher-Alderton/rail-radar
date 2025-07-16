"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StationCard } from "../../components/StationCard";
import Link from "next/link";

export default function StationsPage() {
  const stations = useQuery(api.stations.getAllStationsWithVotes);

  if (stations === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Rail Radar - All Stations
            </h1>
            <Link 
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Home
            </Link>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading stations...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Rail Radar - All Stations
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Report ticket inspector presence at train stations
            </p>
          </div>
          <Link 
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How it works
            </h2>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• 👍 <strong>Thumbs up</strong>: No ticket inspectors currently at this station</li>
              <li>• 👎 <strong>Thumbs down</strong>: Ticket inspectors are present at this station</li>
              <li>• Reports are only valid for 1 hour and then automatically expire</li>
              <li>• You can only vote once per station per hour</li>
            </ul>
          </div>
        </div>

        {stations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No stations found. Please check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                All Stations ({stations.length})
              </h2>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            
            <div className="space-y-3">
              {stations.map((station) => (
                <StationCard 
                  key={station.station_id} 
                  station={station} 
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
} 
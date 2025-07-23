"use client";

import React, { useState, useCallback, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Separator from "@radix-ui/react-separator";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "../../lib/utils";
import { Search, Check, ChevronDown } from "lucide-react";

interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  thumbsUp?: number;
  thumbsDown?: number;
}

interface StationSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function StationSearch({ 
  value, 
  onValueChange, 
  placeholder = "Search for a station...",
  label,
  className 
}: StationSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use Convex search when we have a query, otherwise get all stations
  const searchResults = useQuery(
    api.stations.searchStations,
    debouncedQuery.trim() ? { searchQuery: debouncedQuery.trim() } : "skip"
  );

  const allStations = useQuery(
    api.stations.getAllStationsWithVotes,
    !debouncedQuery.trim() ? {} : "skip"
  );

  // Determine which stations to show
  const stations = debouncedQuery.trim() 
    ? (searchResults || [])
    : (allStations || []); // Remove slice to show all stations

  // Filter to only valid stations with coordinates
  const validStations = stations.filter(station => 
    station.lat && station.lon && 
    !isNaN(station.lat) && !isNaN(station.lon)
  );

  const selectedStation = validStations.find(station => station.station_id === value);

  const handleSelect = useCallback((stationId: string) => {
    onValueChange(stationId);
    setOpen(false);
    // Don't clear search query to maintain context
  }, [onValueChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !selectedStation && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedStation ? selectedStation.name : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className={cn(
              "z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover p-0 text-popover-foreground shadow-md",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
            sideOffset={4}
          >
            {/* Search Input */}
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Type to search..."
                className={cn(
                  "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none",
                  "placeholder:text-muted-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto">
              {validStations.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {debouncedQuery.trim() ? "No stations found." : "No stations available."}
                </div>
              ) : (
                <div className="p-1">
                  {validStations.map((station, index) => (
                    <React.Fragment key={station.station_id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(station.station_id)}
                        className={cn(
                          "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:text-accent-foreground",
                          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{station.name}</div>
                        </div>
                        
                        {value === station.station_id && (
                          <Check className="ml-2 h-4 w-4 shrink-0" />
                        )}
                      </button>
                      {index < validStations.length - 1 && (
                        <Separator.Root className="my-1 h-px bg-border" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
} 
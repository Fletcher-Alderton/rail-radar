"use client";

import React, { useState } from "react";
import Navbar, { NavPage } from "../components/navbar";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { StationCard } from "../components/StationCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import dynamic from "next/dynamic";

// Dynamically import RouteTab with no SSR to prevent Leaflet from running on server
const RouteTab = dynamic(() => import("../components/RouteTab").then(mod => ({ default: mod.RouteTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [current, setCurrent] = useState<NavPage>("stations");
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <>
      <Navbar current={current} onChange={setCurrent} />
      <main className="min-h-screen bg-background pb-20">
        {!isAuthenticated ? (
          <div className="text-center">
            <Card className="max-w-md mx-auto mt-16">
              <CardHeader>
                <CardTitle>Sign in to get started</CardTitle>
                <CardDescription>
                  Join the community in tracking ticket inspector presence at train stations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push("/signin")} className="w-full">
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {current === "stations" && <StationsTab />}

            {current === "favorites" && <FavoritesTab />}
            {current === "route" && <RouteTab />}
            {current === "settings" && <SettingsTab onSignOut={() => {
              void signOut().then(() => {
                router.push("/signin");
              });
            }} />}
          </>
        )}
      </main>
    </>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>This page is coming soon.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function SettingsTab({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Button onClick={onSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StationsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Get total station count using the row count query as it not unique to the user
  const stationCount = useQuery(api.rowCount.getRowCount, { tableName: "stations" });
  
  // Use simple search when there's a search term, otherwise use regular paginated query
  const searchResults = useQuery(
    api.stations.searchStations,
    searchQuery ? { searchQuery } : "skip"
  );
  
  const { results: stations, status, loadMore } = usePaginatedQuery(
    api.stations.getAllStationsWithVotesPaginated,
    {},
    { initialNumItems: 10 }
  );
  
  // Determine which data to display
  const displayStations = searchQuery ? (searchResults || []) : stations;
  const isSearchMode = searchQuery.length > 0;
  
  React.useEffect(() => {
    if (status === "CanLoadMore" && !isSearchMode) {
      const onScroll = () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
          loadMore(10);
        }
      };
      window.addEventListener("scroll", onScroll);
      return () => window.removeEventListener("scroll", onScroll);
    }
  }, [status, loadMore, isSearchMode]);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearching(true);
  };

  // Show loading state for initial page load or when searching
  if (status === "LoadingFirstPage" && !isSearchMode) {
    return (
              <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading stations...</p>
          </div>
        </div>
    );
  }

  // Show loading state for search
  if (isSearchMode && isSearching) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>

        {/* Search Loading State */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching stations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
              {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>

      {displayStations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {isSearchMode 
              ? `No stations found matching "${searchQuery}".` 
              : "No stations found. Please check back later."
            }
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {isSearchMode 
                ? `${displayStations.length} Station${displayStations.length !== 1 ? 's' : ''} found`
                : `${stationCount} Stations`
              }
            </h2>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="space-y-3">
            {displayStations.map((station) => (
              <StationCard key={station.station_id} station={station} />
            ))}
          </div>
          {status === "LoadingMore" && !isSearchMode && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FavoritesTab() {
  // Get total favorites count using the row count query as it uniquely identifies the user
  const favoritesCountArr = useQuery(api.stations.FavoritesCount);
  const favoritesCount = favoritesCountArr ? favoritesCountArr.length : 0;
  const { results: favorites, status, loadMore } = usePaginatedQuery(
    api.stations.getUserFavoriteStationsPaginated,
    {},
    { initialNumItems: 10 }
  );
  React.useEffect(() => {
    if (status === "CanLoadMore") {
      const onScrollFavorites = () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
          loadMore(10);
        }
      };
      window.addEventListener("scroll", onScrollFavorites);
      return () => window.removeEventListener("scroll", onScrollFavorites);
    }
  }, [status, loadMore]);

  if (status === "LoadingFirstPage") {
    return (
          <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading favorites...</p>
      </div>
    </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>No Favorites Yet</CardTitle>
              <CardDescription>
                You haven't added any stations to your favorites yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Go to the stations tab and click the star icon next to any station to add it to your favorites.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {favoritesCount} Favorite Station{favoritesCount !== 1 ? 's' : ''}
            </h2>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="space-y-3">
            {favorites.map((station) => (
              <StationCard key={station.station_id} station={station} />
            ))}
          </div>
          {status === "LoadingMore" && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

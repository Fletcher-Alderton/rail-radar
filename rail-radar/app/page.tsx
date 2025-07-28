"use client";

import React, { useState, useEffect } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

// Dynamically import RouteTab with no SSR to prevent Leaflet from running on server
const RouteTab = dynamic(() => import("../components/RouteTab").then(mod => ({ default: mod.RouteTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen pb-24">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

// Dynamically import RoutePlanningFab
const RoutePlanningFab = dynamic(() => import("../components/RouteTab").then(mod => ({ default: mod.RoutePlanningFab })), {
  ssr: false,
});

export default function Home() {
  const [current, setCurrent] = useState<NavPage>("stations");
  const [showSearch, setShowSearch] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  // Route planning state
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  const [startStation, setStartStation] = useState<string>("");
  const [endStation, setEndStation] = useState<string>("");
  const [showPathfinding, setShowPathfinding] = useState(false);
  const [routeData, setRouteData] = useState<{ pathfindingData: any; stationMap: any; inspectorScores: any } | null>(null);

  // Route planning handlers
  const handleFindPath = () => {
    if (startStation && endStation) {
      setShowPathfinding(true);
      setShowRouteSheet(false);
    }
  };

  const handleClearPath = () => {
    setShowPathfinding(false);
    setStartStation("");
    setEndStation("");
  };

  // Determine which button to show based on current tab
  const getSearchButton = () => {
    if (current === "route") {
      return null; // RoutePlanningFab is now handled within RouteTab component
    }

    const iconSuffix = resolvedTheme === 'dark' ? 'white' : 'black';
    console.log('Search button - resolvedTheme:', resolvedTheme, 'iconSuffix:', iconSuffix);

    return (
      <Button
        className="h-13 w-13 rounded-full bg-background/70 backdrop-blur-xl shadow-xl border border-border/10 p-0 flex flex-col items-center justify-center gap-1 touch-target transition-colors text-muted-foreground hover:text-foreground"
        variant="ghost"
        onClick={() => setShowSearch(!showSearch)}
      >
        <img
          src={`/icons/magnifyingglass.${iconSuffix}.svg`}
          alt="Search"
          width={20}
          height={20}
          className="mb-0.5 select-none opacity-70"
          draggable="false"
        />
      </Button>
    );
  };

  // Get route FAB when on route page
  const getRouteFab = () => {
    if (current !== "route") return null;

    return (
      <RoutePlanningFab
        showRouteSheet={showRouteSheet}
        setShowRouteSheet={setShowRouteSheet}
        startStation={startStation}
        setStartStation={setStartStation}
        endStation={endStation}
        setEndStation={setEndStation}
        handleFindPath={handleFindPath}
        handleClearPath={handleClearPath}
        showPathfinding={showPathfinding}
        pathfindingData={routeData?.pathfindingData}
        stationMap={routeData?.stationMap}
        inspectorScores={routeData?.inspectorScores}
      />
    );
  };

  return (
    <>
      <Navbar 
        current={current} 
        onChange={setCurrent} 
        searchButton={getSearchButton()}
        routeFab={getRouteFab()}
      />

      <main className="min-h-screen bg-background pb-20">
        {!isAuthenticated ? (
          <div className="flex items-center justify-center min-h-screen px-6">
            <div className="relative w-full max-w-md mx-auto">
              {/* Glassmorphism background */}
              <div className="absolute inset-0 rounded-3xl bg-background/60 backdrop-blur-2xl border border-border/10 shadow-2xl" />
              
              {/* Card content */}
              <div className="relative z-10 p-8 text-center">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Sign in to get started
                  </h2>
                  <p className="text-muted-foreground text-base">
                    Join the community in tracking ticket inspector presence at train stations.
                  </p>
                </div>
                <Button 
                  onClick={() => router.push("/signin")} 
                  className="w-full bg-foreground text-background rounded-xl p-4 font-semibold touch-target transition-all hover:bg-foreground/90 active:scale-95 shadow-lg"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {current === "stations" && <StationsTab 
              onSignOut={() => {
                void signOut().then(() => {
                  router.push("/signin");
                });
              }}
              showSearch={showSearch}
              onSearchToggle={() => setShowSearch(!showSearch)}
            />}

            {current === "favorites" && <FavoritesTab 
              showSearch={showSearch}
              onSearchToggle={() => setShowSearch(!showSearch)}
            />}
            {current === "route" && (
              <RouteTab 
                showRouteSheet={showRouteSheet}
                setShowRouteSheet={setShowRouteSheet}
                startStation={startStation}
                setStartStation={setStartStation}
                endStation={endStation}
                setEndStation={setEndStation}
                showPathfinding={showPathfinding}
                setShowPathfinding={setShowPathfinding}
                onRouteDataChange={setRouteData}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

// iOS 26-style Liquid Glass Search Bar Component
function LiquidGlassSearchBar({ 
  searchQuery, 
  onSearchChange, 
  isSearching, 
  isVisible, 
  onClose 
}: {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSearching: boolean;
  isVisible: boolean;
  onClose: () => void;
}) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { resolvedTheme } = useTheme();
  const iconSuffix = resolvedTheme === 'dark' ? 'white' : 'black';
  
  console.log('Search bar - resolvedTheme:', resolvedTheme, 'iconSuffix:', iconSuffix);

  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const height = window.innerHeight - visualViewport.height;
        setKeyboardHeight(height);
        setIsKeyboardVisible(height > 150); // Threshold for keyboard detection
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-x-0 z-50 transition-all duration-300 ease-out"
      style={{
        bottom: isKeyboardVisible ? `${keyboardHeight + 16}px` : '16px',
      }}
    >
      <div className="mx-4">
        <div className="relative">
          {/* Liquid Glass Background */}
          <div className="absolute inset-0 rounded-full bg-background/80 backdrop-blur-xl border border-border/20 shadow-2xl" />
          
          {/* Search Input */}
          <div className="relative flex items-center px-4 py-3">
            <Input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={onSearchChange}
              className="border-0 bg-transparent text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              autoFocus
            />
            
            {/* Search Icon */}
            <div className="absolute left-4 flex items-center pointer-events-none">
              <img
                src={`/icons/magnifyingglass.${iconSuffix}.svg`}
                alt=""
                width={20}
                height={20}
                className="opacity-60"
                draggable="false"
              />
            </div>
            
            {/* Loading Indicator */}
            {isSearching && (
              <div className="absolute right-4 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-2 h-8 w-8 p-0 rounded-full bg-muted/50 hover:bg-muted/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
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



function StationsTab({ onSignOut, showSearch, onSearchToggle }: { onSignOut: () => void; showSearch: boolean; onSearchToggle: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { resolvedTheme } = useTheme();
  const iconSuffix = resolvedTheme === 'dark' ? 'white' : 'black';
  
  console.log('StationsTab - resolvedTheme:', resolvedTheme, 'iconSuffix:', iconSuffix);
  
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

  // Clear search when search is toggled off
  React.useEffect(() => {
    if (!showSearch) {
      setSearchQuery("");
    }
  }, [showSearch]);

  const handleCloseSearch = () => {
    setSearchQuery("");
    onSearchToggle();
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

  return (
    <>
      {/* Liquid Glass Search Bar */}
      <LiquidGlassSearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        isVisible={showSearch}
        onClose={handleCloseSearch}
      />

      <div className="max-w-4xl mx-auto p-6">
        {/* Search Loading State */}
        {isSearchMode && isSearching && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching stations...</p>
            </div>
          </div>
        )}

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
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                  >
                    <img
                      src={`/icons/person.crop.circle.${iconSuffix}.svg`}
                      alt="Profile"
                      width={22}
                      height={22}
                      className="opacity-100"
                      draggable="false"
                    />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="bottom" 
                  className="h-[60vh] rounded-lg border-0 bg-transparent shadow-none p-0 mx-4 mb-4"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col h-full bg-background/60 backdrop-blur-2xl shadow-3xl rounded-3xl border border-border/10">
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-12 h-1 bg-border/30 rounded-full" />
                    </div>
                    
                    <SheetHeader className="pb-6 px-6">
                      <SheetTitle className="flex items-center gap-2">
                        <img
                          src={`/icons/person.crop.circle.${iconSuffix}.svg`}
                          alt=""
                          width={20}
                          height={20}
                          className="opacity-100"
                          draggable="false"
                        />
                        Profile
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="px-6 pb-6 flex-1">
                      <div className="flex flex-col items-center gap-4">
                        <Button onClick={onSignOut} className="w-full touch-target">
                          Sign out
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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
    </>
  );
}

function FavoritesTab({ showSearch, onSearchToggle }: { showSearch: boolean; onSearchToggle: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { resolvedTheme } = useTheme();
  const iconSuffix = resolvedTheme === 'dark' ? 'white' : 'black';
  
  // Get favorites count
  const favoritesCountArr = useQuery(api.stations.FavoritesCount);
  const favoritesCount = favoritesCountArr ? favoritesCountArr.length : 0;
  
  // Use search for favorites when there's a search term, otherwise use regular paginated query
  const searchResults = useQuery(
    api.stations.searchUserFavorites,
    searchQuery ? { searchQuery } : "skip"
  );
  
  const { results: favorites, status, loadMore } = usePaginatedQuery(
    api.stations.getUserFavoriteStationsPaginated,
    {},
    { initialNumItems: 10 }
  );
  
  // Determine which data to display
  const displayFavorites = searchQuery ? (searchResults || []) : favorites;
  const isSearchMode = searchQuery.length > 0;
  
  React.useEffect(() => {
    if (status === "CanLoadMore" && !isSearchMode) {
      const onScrollFavorites = () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
          loadMore(10);
        }
      };
      window.addEventListener("scroll", onScrollFavorites);
      return () => window.removeEventListener("scroll", onScrollFavorites);
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

  // Clear search when search is toggled off
  React.useEffect(() => {
    if (!showSearch) {
      setSearchQuery("");
    }
  }, [showSearch]);

  const handleCloseSearch = () => {
    setSearchQuery("");
    onSearchToggle();
  };

  // Show loading state for initial page load or when searching
  if (status === "LoadingFirstPage" && !isSearchMode) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Liquid Glass Search Bar */}
      <LiquidGlassSearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        isVisible={showSearch}
        onClose={handleCloseSearch}
      />

      <div className="max-w-md mx-auto p-6">
        {/* Search Loading State */}
        {isSearchMode && isSearching && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching favorites...</p>
            </div>
          </div>
        )}

        {displayFavorites.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            {isSearchMode ? (
              <p className="text-muted-foreground text-lg">
                No favorites found matching "{searchQuery}".
              </p>
            ) : (
              <div className="relative max-w-md mx-auto">
                {/* Glassmorphism background */}
                <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-2xl border border-border/10 shadow-2xl" />
                
                {/* Card content */}
                <div className="relative z-10 p-6 text-center">
                  <div className="mb-4">
                    <img
                      src={`/icons/star.${iconSuffix}.svg`}
                      alt=""
                      width={48}
                      height={48}
                      className="mx-auto opacity-50 mb-4"
                      draggable="false"
                    />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Favorites Yet
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground/80">
                    Go to the stations tab and tap the star icon next to any station to add it to your favorites.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">
                {isSearchMode 
                  ? `${displayFavorites.length} Favorite Station${displayFavorites.length !== 1 ? 's' : ''} found`
                  : `${favoritesCount} Favorite Station${favoritesCount !== 1 ? 's' : ''}`
                }
              </h2>
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="space-y-2">
              {displayFavorites.map((station) => (
                <StationCard key={station.station_id} station={station} />
              ))}
            </div>
            {status === "LoadingMore" && !isSearchMode && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mx-auto"></div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

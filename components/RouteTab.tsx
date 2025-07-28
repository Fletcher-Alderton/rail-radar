"use client";

import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { 
  Sheet, 
  SheetContent,
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetPortal,
  SheetOverlay
} from "./ui/sheet";
import { StationSearch } from "./ui/station-search";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Route, 
  X,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useMemo } from "react";


// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons with better mobile visibility
const createCustomIcon = (color: string, size: number = 12) => L.divIcon({
  className: "custom-station-icon",
  html: `<div style="
    width: ${size}px; 
    height: ${size}px; 
    background-color: ${color}; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const stationIcon = createCustomIcon("#3b82f6", 14);
const startStationIcon = createCustomIcon("#10b981", 18);
const endStationIcon = createCustomIcon("#ef4444", 18);
const nextStationIcon = createCustomIcon("#f59e0b", 16);

// Map bounds component
function MapBounds({ stations }: { stations: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map(station => [station.lat, station.lon])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [stations, map]);

  return null;
}

function StationMarkerWithScore({ station, inspectorScores }: { station: any, inspectorScores: Record<string, { score: number; numVotes: number }> }) {
  // Use batch inspectorScores if available
  const inspectorScore = typeof station.station_id === "string" ? inspectorScores[station.station_id] : undefined;

  // Compute color based on inspector score (copied logic from MinimalStationCard)
  let color = "var(--card)";
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
    color = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }
  // Use the same size as the default station icon
  const icon = createCustomIcon(color, 14);

  return (
    <Marker
      key={station.station_id}
      position={[station.lat, station.lon]}
      icon={icon}
    >
      <Popup>
        <div className="text-sm p-2 min-w-[200px]">
          <h3 className="font-semibold ">{station.name}</h3>
        </div>
      </Popup>
    </Marker>
  );
}

function getStationColor(score: number | undefined): string {
  if (typeof score !== "number") return "#22C55E"; // Default blue color instead of white
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
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function GradientPolyline({ from, to, fromScore, toScore, ...props }: {
  from: { lat: number, lon: number },
  to: { lat: number, lon: number },
  fromScore: number | undefined,
  toScore: number | undefined,
  weight?: number,
  opacity?: number,
  dashArray?: string,
  children?: React.ReactNode,
}) {
  // Split the line into two segments for a simple gradient effect
  const mid = {
    lat: (from.lat + to.lat) / 2,
    lon: (from.lon + to.lon) / 2,
  };
  const fromColor = getStationColor(fromScore);
  const toColor = getStationColor(toScore);
  return (
    <>
      <Polyline
        positions={[[from.lat, from.lon], [mid.lat, mid.lon]]}
        color={fromColor}
        weight={props.weight}
        opacity={props.opacity}
        dashArray={props.dashArray}
      >{props.children}</Polyline>
      <Polyline
        positions={[[mid.lat, mid.lon], [to.lat, to.lon]]}
        color={toColor}
        weight={props.weight}
        opacity={props.opacity}
        dashArray={props.dashArray}
      />
    </>
  );
}

// Route Planning FAB Component
export function RoutePlanningFab({ 
  showRouteSheet, 
  setShowRouteSheet, 
  startStation, 
  setStartStation, 
  endStation, 
  setEndStation, 
  handleFindPath, 
  handleClearPath,
  showPathfinding,
  pathfindingData,
  stationMap,
  inspectorScores
}: {
  showRouteSheet: boolean;
  setShowRouteSheet: (show: boolean) => void;
  startStation: string;
  setStartStation: (station: string) => void;
  endStation: string;
  setEndStation: (station: string) => void;
  handleFindPath: () => void;
  handleClearPath: () => void;
  showPathfinding?: boolean;
  pathfindingData?: any;
  stationMap?: Record<string, any>;
  inspectorScores?: Record<string, { score: number; numVotes: number }>;
}) {
  return (
    <Sheet open={showRouteSheet} onOpenChange={setShowRouteSheet}>
      <SheetTrigger asChild>
        <Button
          className="h-13 w-13 rounded-full bg-background/70 backdrop-blur-xl shadow-xl border border-border/10 p-0 flex flex-col items-center justify-center gap-1 touch-target transition-colors text-muted-foreground hover:text-foreground"
          variant="ghost"
          onClick={(e) => {
            // If we have a route, just open the sheet (it will show route results)
            // If no route, the sheet will show planning interface
            if (showPathfinding && pathfindingData?.found) {
              e.preventDefault();
              setShowRouteSheet(true);
            } else {
            }
          }}
        >
          <Route 
            className="h-5 w-5 mb-0.5 select-none transition-colors" 
            style={{ 
              color: showPathfinding && pathfindingData?.found ? 'rgb(34, 197, 94)' : undefined,
              opacity: showPathfinding && pathfindingData?.found ? 1 : 0.7
            }} 
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
          
          {/* Show planning interface when no route is found */}
          {(() => {
            const shouldShowPlanning = !showPathfinding || !pathfindingData?.found;
            return shouldShowPlanning;
          })() ? (
            <>
              <SheetHeader className="pb-6 px-6">
                <SheetTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Plan Your Route
                </SheetTitle>
              </SheetHeader>
              
              <div className="px-6 pb-6 space-y-6 flex-1 overflow-y-auto">
                {/* From Station */}
                <StationSearch
                  value={startStation}
                  onValueChange={setStartStation}
                  placeholder="Select departure station..."
                  label="From"
                />

                {/* To Station */}
                <StationSearch
                  value={endStation}
                  onValueChange={setEndStation}
                  placeholder="Select destination station..."
                  label="To"
                />

                {/* Find Route Button */}
                <Button
                  onClick={handleFindPath}
                  disabled={!startStation || !endStation}
                  className="w-full"
                  size="lg"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Find Route
                </Button>

                {/* Clear Button */}
                {(startStation || endStation) && (
                  <Button
                    onClick={handleClearPath}
                    variant="outline"
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Route
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Show route results when route is found */
            <>
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-foreground/90">Route Found</span>
                    <span className="text-xs text-muted-foreground/70">
                      {pathfindingData.path.length} stops
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearPath}
                    className="h-8 w-8 p-0 rounded-full hover:bg-background/30 transition-colors"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto">
                {/* Route stations with improved styling */}
                <div className="space-y-3">
                  {pathfindingData.path.map((station: any, index: number) => {
                    const stationData = stationMap?.[station.station_id];
                    if (!stationData) return null;
                    
                    // Get inspector score for coloring
                    const inspectorScore = inspectorScores?.[station.station_id]?.score;
                    const dotColor = inspectorScore !== undefined ? getStationColor(inspectorScore) : 
                      (index === 0 ? '#10b981' : 
                       index === pathfindingData.path.length - 1 ? '#ef4444' : 
                       '#3b82f6');
                    
                    return (
                      <div key={`route-${station.station_id}`} className="flex items-start gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <div 
                            className="w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                            style={{ backgroundColor: dotColor }}
                          />
                          {index < pathfindingData.path.length - 1 && (
                            <div className="w-0.5 h-8 bg-border/30 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground/90">
                            {stationData.name}
                          </div>
                          {index === 0 && (
                            <div className="text-xs text-muted-foreground/70 mt-0.5">
                              Departure
                            </div>
                          )}
                          {index === pathfindingData.path.length - 1 && (
                            <div className="text-xs text-muted-foreground/70 mt-0.5">
                              Destination
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Next stations if any */}
                {pathfindingData.nextStations && pathfindingData.nextStations.length > 0 && (
                  <>
                    <div className="border-t border-border/10 my-4" />
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70 mb-3">
                      <MapPin className="h-3 w-3" />
                      Nearby Stations
                    </div>
                    <div className="space-y-2">
                      {pathfindingData.nextStations.map((station: any, index: number) => {
                        const stationData = stationMap?.[station.station_id];
                        if (!stationData) return null;
                        
                        // Get inspector score for coloring
                        const inspectorScore = inspectorScores?.[station.station_id]?.score;
                        const dotColor = inspectorScore !== undefined ? getStationColor(inspectorScore) : '#f59e0b';
                        
                        return (
                          <div key={`next-${station.station_id}`} className="flex items-start gap-3">
                            <div className="flex flex-col items-center pt-1">
                              <div 
                                className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" 
                                style={{ backgroundColor: dotColor }}
                              />
                              {index < pathfindingData.nextStations.length - 1 && (
                                <div className="w-0.5 h-6 bg-border/20 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground/80">
                                {stationData.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function RouteTab({ 
  showRouteSheet, 
  setShowRouteSheet, 
  startStation, 
  setStartStation, 
  endStation, 
  setEndStation, 
  showPathfinding, 
  setShowPathfinding,
  onRouteDataChange
}: {
  showRouteSheet?: boolean;
  setShowRouteSheet?: (show: boolean) => void;
  startStation?: string;
  setStartStation?: (station: string) => void;
  endStation?: string;
  setEndStation?: (station: string) => void;
  showPathfinding?: boolean;
  setShowPathfinding?: (show: boolean) => void;
  onRouteDataChange?: (data: { pathfindingData: any; stationMap: any; inspectorScores: any }) => void;
} = {}) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // Pathfinding state - use props if provided, otherwise use local state
  const [localStartStation, setLocalStartStation] = useState<string>("");
  const [localEndStation, setLocalEndStation] = useState<string>("");
  const [localShowPathfinding, setLocalShowPathfinding] = useState(false);
  const [localShowRouteSheet, setLocalShowRouteSheet] = useState(false);

  // Use props if provided, otherwise use local state
  const actualStartStation = startStation ?? localStartStation;
  const actualSetStartStation = setStartStation ?? setLocalStartStation;
  const actualEndStation = endStation ?? localEndStation;
  const actualSetEndStation = setEndStation ?? setLocalEndStation;
  const actualShowPathfinding = showPathfinding ?? localShowPathfinding;
  const actualSetShowPathfinding = setShowPathfinding ?? setLocalShowPathfinding;
  const actualShowRouteSheet = showRouteSheet ?? localShowRouteSheet;
  const actualSetShowRouteSheet = setShowRouteSheet ?? setLocalShowRouteSheet;

  // Fetch data from Convex
  const rawStations = useQuery(api.stations.getAllStationsWithVotes);
  const stations = useMemo(() => rawStations ?? [], [rawStations]);

  const rawEdges = useQuery(api.routes.getAllEdges);
  const edges = useMemo(() => rawEdges ?? [], [rawEdges]);

  const rawRoutes = useQuery(api.routes.getAllRoutes);
  const routes = useMemo(() => rawRoutes ?? [], [rawRoutes]);

  // Gather all station_ids
  const stationIds = useMemo(() => stations.map(s => s.station_id), [stations]);
  // Batch fetch inspector scores for all stations
  const rawInspectorScores = useQuery(
    api.stations.getInspectorScores,
    stationIds.length > 0 ? { station_ids: stationIds } : "skip"
  );
  const inspectorScores = useMemo(() => rawInspectorScores ?? {}, [rawInspectorScores]);

  // Fetch pathfinding results
  const pathfindingData = useQuery(
    api.routes.findPathBetweenStations,
    actualShowPathfinding && actualStartStation && actualEndStation
      ? { startStationId: actualStartStation, endStationId: actualEndStation }
      : "skip"
  );

  // Filter stations to show only those with coordinates
  const validStations = stations.filter(station => 
    station.lat && station.lon && 
    !isNaN(station.lat) && !isNaN(station.lon)
  );

  // Create route polylines from edges
  const routePolylines = edges.map((edge: any) => {
    const fromStation = validStations.find(s => s.station_id === edge.from_station);
    const toStation = validStations.find(s => s.station_id === edge.to_station);
    
    if (fromStation && toStation) {
      return {
        id: `${edge.from_station}-${edge.to_station}-${edge.edge_type}-${edge.direction_id}`,
        positions: [
          [fromStation.lat, fromStation.lon],
          [toStation.lat, toStation.lon]
        ],
        routeIds: edge.route_ids,
        weight: edge.weight,
        edgeType: edge.edge_type
      };
    }
    return null;
  }).filter(Boolean);

  // Filter polylines based on selected route or pathfinding
  const filteredPolylines = actualShowPathfinding && pathfindingData?.found
    ? [
        // Main path edges
        ...pathfindingData.edges.map((edge: any) => {
          const fromStation = validStations.find(s => s.station_id === edge.from_station);
          const toStation = validStations.find(s => s.station_id === edge.to_station);
          
          if (fromStation && toStation) {
            return {
              id: `path-${edge.from_station}-${edge.to_station}-${edge.edge_type}-${edge.direction_id}`,
              positions: [
                [fromStation.lat, fromStation.lon],
                [toStation.lat, toStation.lon]
              ],
              routeIds: edge.route_ids,
              weight: edge.weight,
              edgeType: edge.edge_type,
              isNextEdge: false
            };
          }
          return null;
        }).filter(Boolean),
        // Next edges (after destination)
        ...(pathfindingData.nextEdges || []).map((edge: any) => {
          const fromStation = validStations.find(s => s.station_id === edge.from_station);
          const toStation = validStations.find(s => s.station_id === edge.to_station);
          
          if (fromStation && toStation) {
            return {
              id: `next-${edge.from_station}-${edge.to_station}-${edge.edge_type}-${edge.direction_id}`,
              positions: [
                [fromStation.lat, fromStation.lon],
                [toStation.lat, toStation.lon]
              ],
              routeIds: edge.route_ids,
              weight: edge.weight,
              edgeType: edge.edge_type,
              isNextEdge: true
            };
          }
          return null;
        }).filter(Boolean)
      ]
    : selectedRoute 
      ? routePolylines.filter((polyline: any) => 
          polyline && polyline.routeIds.includes(selectedRoute)
        )
      : routePolylines;

  // Build a lookup map from stations by station_id
  const stationMap = React.useMemo(() => {
    const map: Record<string, typeof stations[0]> = {};
    for (const s of stations) {
      map[s.station_id] = s;
    }
    return map;
  }, [stations]);

  // Store the callback function in a ref to avoid dependency issues
  const onRouteDataChangeRef = useRef(onRouteDataChange);
  useEffect(() => {
    onRouteDataChangeRef.current = onRouteDataChange;
  }, [onRouteDataChange]);

  // Notify parent of route data changes
  useEffect(() => {
    if (onRouteDataChangeRef.current && typeof onRouteDataChangeRef.current === 'function') {
      try {
        onRouteDataChangeRef.current({
          pathfindingData: pathfindingData || null,
          stationMap: stationMap || {},
          inspectorScores: inspectorScores || {}
        });
      } catch (error) {
        console.error('Error calling onRouteDataChange:', error);
      }
    }
  }, [pathfindingData, stationMap, inspectorScores]);

  // Filter stations to show based on pathfinding
  const stationsToShow = actualShowPathfinding && pathfindingData?.found
    ? [
        ...pathfindingData.path.map((s: any) => stationMap[s.station_id] || s),
        ...((pathfindingData.nextStations || []).map((s: any) => stationMap[s.station_id] || s))
      ]
    : validStations;

  // Handle pathfinding search - simplified single step
  const handleFindPath = () => {
    if (actualStartStation && actualEndStation) {
      actualSetShowPathfinding(true);
      actualSetShowRouteSheet(false);
    }
  };

  // Handle clear pathfinding
  const handleClearPath = () => {
    actualSetShowPathfinding(false);
    actualSetStartStation("");
    actualSetEndStation("");
  };

  const getSelectedStationName = (stationId: string) => {
    const station = stationMap[stationId];
    return station?.name || "";
  };

  return (
    <div className="relative w-full h-screen">
      {/* Map */}
      <MapContainer
        center={[-37.8136, 144.9631]} // Melbourne coordinates
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        zoomControl={false}
      >
        {/* Use dark tiles in dark mode */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          className="dark:contrast-125 dark:brightness-75"
        />

        {/* Map bounds */}
        <MapBounds stations={actualShowPathfinding && pathfindingData?.found ? pathfindingData.path : validStations} />

        {/* Route Polylines */}
        {showRoutes && filteredPolylines.map((polyline: any, index: number) => {
          // Get the two stations for this polyline
          const fromStation = validStations.find(s => s.lat === polyline.positions[0][0] && s.lon === polyline.positions[0][1]);
          const toStation = validStations.find(s => s.lat === polyline.positions[1][0] && s.lon === polyline.positions[1][1]);
          // Use batch inspector scores
          const fromScore = fromStation ? inspectorScores[fromStation.station_id]?.score : undefined;
          const toScore = toStation ? inspectorScores[toStation.station_id]?.score : undefined;
          return (
            <GradientPolyline
              key={polyline.id}
              from={fromStation || { lat: polyline.positions[0][0], lon: polyline.positions[0][1] }}
              to={toStation || { lat: polyline.positions[1][0], lon: polyline.positions[1][1] }}
              fromScore={fromScore}
              toScore={toScore}
              weight={actualShowPathfinding && pathfindingData?.found ? 5 : 4}
              opacity={polyline.isNextEdge ? 0.6 : 0.8}
              dashArray={polyline.isNextEdge ? "5, 5" : undefined}
            >
              <Popup>
                <div className="text-sm p-2">
                  <p><strong>Route:</strong> {polyline.routeIds.join(", ")}</p>
                  <p><strong>Type:</strong> {polyline.edgeType}</p>
                  <p><strong>Time:</strong> {Math.round(polyline.weight / 60)} min</p>
                  {polyline.isNextEdge && (
                    <Badge variant="warning" className="mt-2">Next station</Badge>
                  )}
                </div>
              </Popup>
            </GradientPolyline>
          );
        })}

        {/* Station Markers */}
        {showStations && stationsToShow.map((station) => {
          // All station markers use inspector score color logic
          return <StationMarkerWithScore key={station.station_id} station={station} inspectorScores={inspectorScores} />;
        })}
      </MapContainer>



      {/* No route found overlay */}
      {actualShowPathfinding && pathfindingData && !pathfindingData.found && (
        <div className="fixed top-4 left-4 right-4 z-10 md:max-w-sm">
          <Card className="p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">No Route</Badge>
                <span className="text-sm font-medium">Not connected</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearPath}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              No route found between selected stations
            </div>
          </Card>
        </div>
      )}


    </div>
  );
}

// Export a separate RouteFab component for use in navbar
export function RouteFab({ 
  showRouteSheet, 
  setShowRouteSheet, 
  startStation, 
  setStartStation, 
  endStation, 
  setEndStation, 
  showPathfinding, 
  setShowPathfinding,
  pathfindingData,
  stationMap,
  inspectorScores
}: {
  showRouteSheet: boolean;
  setShowRouteSheet: (show: boolean) => void;
  startStation: string;
  setStartStation: (station: string) => void;
  endStation: string;
  setEndStation: (station: string) => void;
  showPathfinding: boolean;
  setShowPathfinding: (show: boolean) => void;
  pathfindingData?: any;
  stationMap?: Record<string, any>;
  inspectorScores?: Record<string, { score: number; numVotes: number }>;
}) {
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
      pathfindingData={pathfindingData}
      stationMap={stationMap}
      inspectorScores={inspectorScores}
    />
  );
}
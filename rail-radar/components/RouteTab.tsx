"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { MinimalStationCard } from "./MinimalStationCard";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "./ui/sheet";
import { StationSearch } from "./ui/station-search";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Fab } from "./ui/fab";
import { Card } from "./ui/card";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Route, 
  X
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
  let color = "#18181b";
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
  if (typeof score !== "number") return "#18181b";
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

export function RouteTab() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // Pathfinding state
  const [startStation, setStartStation] = useState<string>("");
  const [endStation, setEndStation] = useState<string>("");
  const [showPathfinding, setShowPathfinding] = useState(false);
  const [showRouteSheet, setShowRouteSheet] = useState(false);

  // Fetch data from Convex
  const stations = useQuery(api.stations.getAllStationsWithVotes) || [];
  const edges = useQuery(api.routes.getAllEdges) || [];
  const routes = useQuery(api.routes.getAllRoutes) || [];

  // Gather all station_ids
  const stationIds = useMemo(() => stations.map(s => s.station_id), [stations]);
  // Batch fetch inspector scores for all stations
  const inspectorScores = useQuery(
    api.stations.getInspectorScores,
    stationIds.length > 0 ? { station_ids: stationIds } : "skip"
  ) || {};

  // Fetch pathfinding results
  const pathfindingData = useQuery(
    api.routes.findPathBetweenStations,
    showPathfinding && startStation && endStation
      ? { startStationId: startStation, endStationId: endStation }
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
        id: `${edge.from_station}-${edge.to_station}`,
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
  const filteredPolylines = showPathfinding && pathfindingData?.found
    ? [
        // Main path edges
        ...pathfindingData.edges.map((edge: any) => {
          const fromStation = validStations.find(s => s.station_id === edge.from_station);
          const toStation = validStations.find(s => s.station_id === edge.to_station);
          
          if (fromStation && toStation) {
            return {
              id: `path-${edge.from_station}-${edge.to_station}`,
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
              id: `next-${edge.from_station}-${edge.to_station}`,
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

  // Filter stations to show based on pathfinding
  const stationsToShow = showPathfinding && pathfindingData?.found
    ? [
        ...pathfindingData.path.map((s: any) => stationMap[s.station_id] || s),
        ...((pathfindingData.nextStations || []).map((s: any) => stationMap[s.station_id] || s))
      ]
    : validStations;

  // Handle pathfinding search - simplified single step
  const handleFindPath = () => {
    if (startStation && endStation) {
      setShowPathfinding(true);
      setShowRouteSheet(false);
    }
  };

  // Handle clear pathfinding
  const handleClearPath = () => {
    setShowPathfinding(false);
    setStartStation("");
    setEndStation("");
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
        <MapBounds stations={showPathfinding && pathfindingData?.found ? pathfindingData.path : validStations} />

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
              weight={showPathfinding && pathfindingData?.found ? 5 : 4}
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

      {/* Route Planning FAB - positioned at top with transparency */}
      <div className="fixed top-4 right-4 z-10">
        <Sheet open={showRouteSheet} onOpenChange={setShowRouteSheet}>
          <SheetTrigger asChild>
            <Fab variant="accent" className="bg-black shadow-lg border border-white/20">
              <Route className="h-6 w-6" />
            </Fab>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-t-2">
            <SheetHeader className="pb-6">
              <SheetTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Plan Your Route
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6">
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
          </SheetContent>
        </Sheet>
      </div>

      {/* Route results overlay for mobile */}
      {showPathfinding && pathfindingData?.found && (
        <div className="fixed top-4 left-4 right-4 z-10 md:max-w-sm">
          <Card className="p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs">Active Route</Badge>
                <span className="text-sm font-medium">
                  {Math.round(pathfindingData.totalWeight / 60)} min
                </span>
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
              {getSelectedStationName(startStation)} → {getSelectedStationName(endStation)}
            </div>
          </Card>
        </div>
      )}

      {/* No route found overlay */}
      {showPathfinding && pathfindingData && !pathfindingData.found && (
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
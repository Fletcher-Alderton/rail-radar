"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom station icon
const stationIcon = L.divIcon({
  className: "custom-station-icon",
  html: `<div style="
    width: 12px; 
    height: 12px; 
    background-color: #3b82f6; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Custom route icon
const routeIcon = L.divIcon({
  className: "custom-route-icon",
  html: `<div style="
    width: 8px; 
    height: 8px; 
    background-color: #ef4444; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

// Custom start station icon
const startStationIcon = L.divIcon({
  className: "custom-start-station-icon",
  html: `<div style="
    width: 16px; 
    height: 16px; 
    background-color: #10b981; 
    border: 3px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Custom end station icon
const endStationIcon = L.divIcon({
  className: "custom-end-station-icon",
  html: `<div style="
    width: 16px; 
    height: 16px; 
    background-color: #ef4444; 
    border: 3px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Custom next station icon
const nextStationIcon = L.divIcon({
  className: "custom-next-station-icon",
  html: `<div style="
    width: 14px; 
    height: 14px; 
    background-color: #f59e0b; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Map bounds component
function MapBounds({ stations }: { stations: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map(station => [station.lat, station.lon])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [stations, map]);

  return null;
}

export function RouteTab() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // Pathfinding state
  const [startStation, setStartStation] = useState<string>("");
  const [endStation, setEndStation] = useState<string>("");
  const [startSearchQuery, setStartSearchQuery] = useState<string>("");
  const [endSearchQuery, setEndSearchQuery] = useState<string>("");
  const [showPathfinding, setShowPathfinding] = useState(false);
  const [pathfindingResults, setPathfindingResults] = useState<any>(null);

  // Fetch data from Convex
  const stations = useQuery(api.stations.getAllStationsWithVotes) || [];
  const edges = useQuery(api.routes.getAllEdges) || [];
  const routes = useQuery(api.routes.getAllRoutes) || [];
  
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

  // Filter stations to show based on pathfinding
  const stationsToShow = showPathfinding && pathfindingData?.found
    ? [...pathfindingData.path, ...(pathfindingData.nextStations || [])]
    : validStations;

  // Handle pathfinding search
  const handleFindPath = () => {
    if (startStation && endStation) {
      setShowPathfinding(true);
      setShowStations(true);
      setShowRoutes(true);
    }
  };

  // Handle clear pathfinding
  const handleClearPath = () => {
    setShowPathfinding(false);
    setStartStation("");
    setEndStation("");
    setStartSearchQuery("");
    setEndSearchQuery("");
    setPathfindingResults(null);
  };

  // Filter stations for search dropdowns
  const filteredStartStations = validStations.filter(station =>
    station.name.toLowerCase().includes(startSearchQuery.toLowerCase())
  ).slice(0, 10);

  const filteredEndStations = validStations.filter(station =>
    station.name.toLowerCase().includes(endSearchQuery.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Pathfinding Controls */}
      <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Find Route Between Stations</h3>
            <button
              onClick={handleClearPath}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
          
          <div className="flex space-x-4">
            {/* Start Station */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Station
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for start station..."
                  value={startSearchQuery}
                  onChange={(e) => setStartSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {startSearchQuery && filteredStartStations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredStartStations.map((station) => (
                      <button
                        key={station.station_id}
                        onClick={() => {
                          setStartStation(station.station_id);
                          setStartSearchQuery(station.name);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {station.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* End Station */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Station
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for end station..."
                  value={endSearchQuery}
                  onChange={(e) => setEndSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {endSearchQuery && filteredEndStations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredEndStations.map((station) => (
                      <button
                        key={station.station_id}
                        onClick={() => {
                          setEndStation(station.station_id);
                          setEndSearchQuery(station.name);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {station.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleFindPath}
              disabled={!startStation || !endStation}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Find Route
            </button>
          </div>

          {/* Pathfinding Results */}
          {showPathfinding && pathfindingData && (
            <div className="bg-blue-50 p-3 rounded-md">
              {pathfindingData.found ? (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Route found!</strong> Total journey time: {Math.round(pathfindingData.totalWeight / 60)} minutes
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {pathfindingData.path.length} stations • {pathfindingData.edges.length} segments
                  </p>
                  {pathfindingData.nextStations && pathfindingData.nextStations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-1">Next 3 stations after destination:</p>
                      <div className="flex flex-wrap gap-2">
                        {pathfindingData.nextStations.map((station: any, index: number) => (
                          <span key={station.station_id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            {station.name} (+{Math.round(station.distance / 60)}min)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-800">
                  <strong>No route found</strong> between the selected stations.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={[-37.8136, 144.9631]} // Melbourne coordinates
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
          zoomControl={false}
        >
          {/* CartoDB Positron tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {/* Map bounds */}
          <MapBounds stations={showPathfinding && pathfindingData?.found ? pathfindingData.path : validStations} />

          {/* Route Polylines */}
          {showRoutes && filteredPolylines.map((polyline: any, index: number) => (
            <Polyline
              key={polyline.id}
              positions={polyline.positions as [number, number][]}
              color={
                showPathfinding && pathfindingData?.found 
                  ? polyline.isNextEdge 
                    ? "#f59e0b" // Orange for next edges
                    : "#ef4444"  // Red for main path
                  : selectedRoute 
                    ? "#ef4444" 
                    : "#3b82f6"
              }
              weight={showPathfinding && pathfindingData?.found ? 4 : 3}
              opacity={polyline.isNextEdge ? 0.6 : 0.8}
              dashArray={polyline.isNextEdge ? "5, 5" : undefined}
            >
              <Popup>
                <div className="text-sm">
                  <p><strong>Route:</strong> {polyline.routeIds.join(", ")}</p>
                  <p><strong>Type:</strong> {polyline.edgeType}</p>
                  <p><strong>Weight:</strong> {polyline.weight}</p>
                  {polyline.isNextEdge && (
                    <p className="text-orange-600 font-medium">Next station after destination</p>
                  )}
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Station Markers */}
          {showStations && stationsToShow.map((station) => {
            // Determine which icon to use
            let icon = stationIcon;
            if (showPathfinding && pathfindingData?.found) {
              if (station.station_id === startStation) {
                icon = startStationIcon;
              } else if (station.station_id === endStation) {
                icon = endStationIcon;
              } else if (pathfindingData.nextStations && pathfindingData.nextStations.some((s: any) => s.station_id === station.station_id)) {
                icon = nextStationIcon;
              }
            }

            return (
              <Marker
                key={station.station_id}
                position={[station.lat, station.lon]}
                icon={icon}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-semibold text-slate-900">{station.name}</h3>
                    <p className="text-slate-600">ID: {station.station_id}</p>
                    <p className="text-slate-600">
                      Coordinates: {station.lat.toFixed(6)}, {station.lon.toFixed(6)}
                    </p>
                    {showPathfinding && pathfindingData?.found && pathfindingData.nextStations && pathfindingData.nextStations.some((s: any) => s.station_id === station.station_id) && (
                      <p className="text-orange-600 font-medium">
                        Next station after destination (+{Math.round((pathfindingData.nextStations.find((s: any) => s.station_id === station.station_id)?.distance || 0) / 60)}min)
                      </p>
                    )}
                    {!showPathfinding && 'platforms' in station && Array.isArray(station.platforms) && station.platforms.length > 0 && (
                      <p className="text-slate-600">
                        Platforms: {station.platforms.length}
                      </p>
                    )}
                    {!showPathfinding && 'thumbsUp' in station && typeof station.thumbsUp === 'number' && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          👍 {station.thumbsUp} 👎 {(station as any).thumbsDown || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
} 
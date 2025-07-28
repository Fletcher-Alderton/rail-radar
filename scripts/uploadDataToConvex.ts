import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import fs from 'fs';
import path from 'path';

// Initialize Convex client
// Replace with your actual Convex deployment URL
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://healthy-ibex-649.convex.cloud");

async function loadJSONFile(filePath: string) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, (error as Error).message);
    return null;
  }
}

async function loadRailGraph(jsonPath: string) {
  const data = await loadJSONFile(jsonPath);
  if (!data) {
    throw new Error("Failed to load rail graph JSON file");
  }

  // Convert stations object into array (values)
  const stations = Object.values(data.stations ?? {}).map((s: any) => ({
    station_id: s.station_id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    platforms: s.platforms ?? [],
  }));

  const edges = (data.edges ?? []).map((e: any) => ({
    from_station: e.from_station,
    to_station: e.to_station,
    edge_type: e.edge_type,
    weight: e.weight,
    route_ids: e.route_ids ?? [],
    direction_id: e.direction_id ?? 0,
  }));

  // Flatten closest_stations into array of objects
  const closestStations: any[] = [];
  if (data.closest_stations) {
    Object.entries(data.closest_stations).forEach(([src, list]: [string, any]) => {
      (list as any[]).forEach((entry) => {
        closestStations.push({
          station_id: src,
          close_station_id: entry.station_id,
          distance: entry.distance,
          route_ids: entry.route_ids ?? [],
        });
      });
    });
  }

  // Convert route_to_stations mapping
  const routeToStations: any[] = [];
  if (data.route_to_stations) {
    Object.entries(data.route_to_stations).forEach(([routeId, stationsArr]: [string, any]) => {
      routeToStations.push({ route_id: routeId, stations: stationsArr as string[] });
    });
  }

  return { stations, edges, closestStations, routeToStations };
}

async function uploadRailGraphData() {
  const jsonPath = path.join(__dirname, "../public/precomputed_rail_data.json");
  console.log(`Loading rail graph from ${jsonPath}`);
  const { stations, edges, closestStations, routeToStations } = await loadRailGraph(jsonPath);

  console.log(`Uploading ${stations.length} stations, ${edges.length} edges, ${closestStations.length} closest links, ${routeToStations.length} route mappings...`);
  const result = await convex.mutation(api.dataUpload.uploadRailGraph, {
    stations,
    edges,
    closestStations,
    routeToStations,
  });
  console.log("Upload complete:", result);
}

// Run if executed directly
if (require.main === module) {
  uploadRailGraphData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} 
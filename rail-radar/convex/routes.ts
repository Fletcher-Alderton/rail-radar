import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all edges from the database
export const getAllEdges = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("edges"),
      _creationTime: v.number(),
      from_station: v.string(),
      to_station: v.string(),
      edge_type: v.string(),
      weight: v.number(),
      route_ids: v.array(v.string()),
      direction_id: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("edges").collect();
  },
});

// Get all routes (extracted from edges)
export const getAllRoutes = query({
  args: {},
  returns: v.array(
    v.object({
      route_id: v.string(),
      route_short_name: v.optional(v.string()),
      route_long_name: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const edges = await ctx.db.query("edges").collect();
    
    // Extract unique route IDs from edges
    const routeIds = new Set<string>();
    edges.forEach(edge => {
      edge.route_ids.forEach(routeId => routeIds.add(routeId));
    });
    
    // Convert to array of route objects
    return Array.from(routeIds).map(routeId => ({
      route_id: routeId,
      route_short_name: routeId,
      route_long_name: `Route ${routeId}`,
    }));
  },
});

// Get edges for a specific route
export const getEdgesByRoute = query({
  args: {
    routeId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("edges"),
      _creationTime: v.number(),
      from_station: v.string(),
      to_station: v.string(),
      edge_type: v.string(),
      weight: v.number(),
      route_ids: v.array(v.string()),
      direction_id: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const edges = await ctx.db.query("edges").collect();
    return edges.filter(edge => edge.route_ids.includes(args.routeId));
  },
});

// Find shortest path between two stations using Dijkstra's algorithm
export const findPathBetweenStations = query({
  args: {
    startStationId: v.string(),
    endStationId: v.string(),
  },
  returns: v.object({
    path: v.array(
      v.object({
        station_id: v.string(),
        name: v.string(),
        lat: v.number(),
        lon: v.number(),
      })
    ),
    edges: v.array(
      v.object({
        from_station: v.string(),
        to_station: v.string(),
        edge_type: v.string(),
        weight: v.number(),
        route_ids: v.array(v.string()),
      })
    ),
    nextStations: v.array(
      v.object({
        station_id: v.string(),
        name: v.string(),
        lat: v.number(),
        lon: v.number(),
        distance: v.number(),
      })
    ),
    nextEdges: v.array(
      v.object({
        from_station: v.string(),
        to_station: v.string(),
        edge_type: v.string(),
        weight: v.number(),
        route_ids: v.array(v.string()),
      })
    ),
    totalWeight: v.number(),
    found: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const edges = await ctx.db.query("edges").collect();
    const stations = await ctx.db.query("stations").collect();
    
    // Create adjacency list
    const graph: Record<string, Array<{to: string, weight: number, edge: any}>> = {};
    
    // Initialize graph
    stations.forEach(station => {
      graph[station.station_id] = [];
    });
    
    // Add edges to graph
    edges.forEach(edge => {
      if (graph[edge.from_station]) {
        graph[edge.from_station].push({
          to: edge.to_station,
          weight: edge.weight,
          edge: edge
        });
      }
    });
    
    // Dijkstra's algorithm
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const visited = new Set<string>();
    
    // Initialize distances
    stations.forEach(station => {
      distances[station.station_id] = Infinity;
      previous[station.station_id] = null;
    });
    distances[args.startStationId] = 0;
    
    // Find shortest path
    while (visited.size < stations.length) {
      // Find unvisited node with minimum distance
      let minDistance = Infinity;
      let currentNode: string | null = null;
      
      for (const stationId of Object.keys(distances)) {
        if (!visited.has(stationId) && distances[stationId] < minDistance) {
          minDistance = distances[stationId];
          currentNode = stationId;
        }
      }
      
      if (currentNode === null) break;
      
      visited.add(currentNode);
      
      // Update distances to neighbors
      if (graph[currentNode]) {
        for (const neighbor of graph[currentNode]) {
          const newDistance = distances[currentNode] + neighbor.weight;
          if (newDistance < distances[neighbor.to]) {
            distances[neighbor.to] = newDistance;
            previous[neighbor.to] = currentNode;
          }
        }
      }
    }
    
    // Reconstruct path
    const path: string[] = [];
    let current: string | null = args.endStationId;
    
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
    
    // Check if path exists
    if (path[0] !== args.startStationId) {
      return {
        path: [],
        edges: [],
        nextStations: [],
        nextEdges: [],
        totalWeight: 0,
        found: false,
      };
    }
    
    // Get station details for path
    const pathStations = path.map(stationId => {
      const station = stations.find(s => s.station_id === stationId);
      return {
        station_id: station!.station_id,
        name: station!.name,
        lat: station!.lat,
        lon: station!.lon,
      };
    });
    
    // Get edges for the path
    const pathEdges = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = edges.find(e => 
        e.from_station === path[i] && e.to_station === path[i + 1]
      );
      if (edge) {
        pathEdges.push({
          from_station: edge.from_station,
          to_station: edge.to_station,
          edge_type: edge.edge_type,
          weight: edge.weight,
          route_ids: edge.route_ids,
        });
      }
    }
    
    // Find next three stations after end station (excluding stations already in the path)
    const nextStations = [];
    const nextEdges = [];
    let currentStation = args.endStationId;
    let totalDistance = 0;
    
    // Create a set of station IDs that are already in the path
    const pathStationIds = new Set(path);
    
    for (let i = 0; i < 3; i++) {
      // Find all edges from current station
      const outgoingEdges = edges.filter(e => e.from_station === currentStation);
      
      if (outgoingEdges.length > 0) {
        // Find the first edge that leads to a station not already in the path
        const nextEdge = outgoingEdges.find(edge => !pathStationIds.has(edge.to_station));
        
        if (nextEdge) {
          const nextStation = stations.find(s => s.station_id === nextEdge.to_station);
          
          if (nextStation) {
            totalDistance += nextEdge.weight;
            nextStations.push({
              station_id: nextStation.station_id,
              name: nextStation.name,
              lat: nextStation.lat,
              lon: nextStation.lon,
              distance: totalDistance,
            });
            // Add the edge to nextEdges
            nextEdges.push({
              from_station: nextEdge.from_station,
              to_station: nextEdge.to_station,
              edge_type: nextEdge.edge_type,
              weight: nextEdge.weight,
              route_ids: nextEdge.route_ids,
            });
            currentStation = nextStation.station_id;
          } else {
            break;
          }
        } else {
          // If all outgoing edges lead to stations already in the path, try to find alternative routes
          // Look for any edge that doesn't lead back to a path station
          const alternativeEdge = edges.find(edge => 
            edge.from_station === currentStation && !pathStationIds.has(edge.to_station)
          );
          
          if (alternativeEdge) {
            const nextStation = stations.find(s => s.station_id === alternativeEdge.to_station);
            if (nextStation) {
              totalDistance += alternativeEdge.weight;
              nextStations.push({
                station_id: nextStation.station_id,
                name: nextStation.name,
                lat: nextStation.lat,
                lon: nextStation.lon,
                distance: totalDistance,
              });
              // Add the edge to nextEdges
              nextEdges.push({
                from_station: alternativeEdge.from_station,
                to_station: alternativeEdge.to_station,
                edge_type: alternativeEdge.edge_type,
                weight: alternativeEdge.weight,
                route_ids: alternativeEdge.route_ids,
              });
              currentStation = nextStation.station_id;
            } else {
              break;
            }
          } else {
            break;
          }
        }
      } else {
        break;
      }
    }
    
    return {
      path: pathStations,
      edges: pathEdges,
      nextStations: nextStations,
      nextEdges: nextEdges,
      totalWeight: distances[args.endStationId],
      found: true,
    };
  },
}); 
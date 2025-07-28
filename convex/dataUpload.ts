import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Bulk upload of the new rail graph JSON format (stations + edges)
export const uploadRailGraph = mutation({
  args: {
    stations: v.array(
      v.object({
        station_id: v.string(),
        name: v.string(),
        lat: v.number(),
        lon: v.number(),
        platforms: v.array(v.string()),
      })
    ),
    edges: v.array(
      v.object({
        from_station: v.string(),
        to_station: v.string(),
        edge_type: v.string(),
        weight: v.number(),
        route_ids: v.array(v.string()),
        direction_id: v.number(),
      })
    ),
    closestStations: v.optional(
      v.array(
        v.object({
          station_id: v.string(),
          close_station_id: v.string(),
          distance: v.number(),
          route_ids: v.array(v.string()),
        })
      )
    ),
    routeToStations: v.optional(
      v.array(
        v.object({
          route_id: v.string(),
          stations: v.array(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const stationIds: string[] = [];
    for (const station of args.stations) {
      stationIds.push(await ctx.db.insert("stations", station));
    }

    const edgeIds: string[] = [];
    for (const edge of args.edges) {
      edgeIds.push(await ctx.db.insert("edges", edge));
    }

    // Insert closest stations if provided
    if (args.closestStations) {
      for (const cs of args.closestStations) {
        await ctx.db.insert("closest_stations", cs);
      }
    }

    // Insert route to stations if provided
    if (args.routeToStations) {
      for (const rts of args.routeToStations) {
        await ctx.db.insert("route_to_stations", rts);
      }
    }

    return {
      stationsInserted: stationIds.length,
      edgesInserted: edgeIds.length,
      closestStationsInserted: args.closestStations?.length ?? 0,
      routeToStationsInserted: args.routeToStations?.length ?? 0,
    };
  },
});

// Helper mutation to check counts of the new tables
export const getDataCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db.query("stations").collect();
    const edges = await ctx.db.query("edges").collect();
    const closest = await ctx.db.query("closest_stations").collect();
    const rts = await ctx.db.query("route_to_stations").collect();
    return {
      stations: stations.length,
      edges: edges.length,
      closest_stations: closest.length,
      route_to_stations: rts.length,
    };
  },
}); 
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Upload stations data
export const uploadStations = mutation({
  args: {
    stations: v.array(
      v.object({
        station_id: v.string(),
        station_name: v.string(),
        station_lat: v.number(),
        station_lon: v.number(),
        platforms: v.array(
          v.object({
            stop_id: v.string(),
            stop_lat: v.number(),
            stop_lon: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const station of args.stations) {
      const result = await ctx.db.insert("stations", station);
      results.push(result);
    }
    return { inserted: results.length, ids: results };
  },
});

// Upload routes data
export const uploadRoutes = mutation({
  args: {
    routes: v.array(
      v.object({
        route_id: v.string(),
        route_type: v.string(),
        route_long_name: v.union(v.string(), v.null()),
        route_short_name: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const route of args.routes) {
      const result = await ctx.db.insert("routes", route);
      results.push(result);
    }
    return { inserted: results.length, ids: results };
  },
});

// Upload shapes data (batch upload due to large size)
export const uploadShapesBatch = mutation({
  args: {
    shapes: v.array(
      v.object({
        shape_id: v.string(),
        points: v.array(
          v.object({
            lat: v.number(),
            lon: v.number(),
            sequence: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const shape of args.shapes) {
      const result = await ctx.db.insert("shapes", shape);
      results.push(result);
    }
    return { inserted: results.length, ids: results };
  },
});

// Upload trips data
export const uploadTrips = mutation({
  args: {
    trips: v.array(
      v.object({
        trip_id: v.string(),
        route_id: v.string(),
        trip_headsign: v.string(),
        shape_id: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const trip of args.trips) {
      const result = await ctx.db.insert("trips", trip);
      results.push(result);
    }
    return { inserted: results.length, ids: results };
  },
});

// Upload precomputed routes data
export const uploadPrecomputedRoutes = mutation({
  args: {
    precomputedRoutes: v.array(
      v.object({
        id: v.string(),
        from_stop_id: v.string(),
        from_stop_name: v.string(),
        from_lat: v.number(),
        from_lon: v.number(),
        to_stop_id: v.string(),
        to_stop_name: v.string(),
        to_lat: v.number(),
        to_lon: v.number(),
        direct_routes: v.array(
          v.object({
            route_id: v.string(),
            route_name: v.union(v.string(), v.null()),
            route_short_name: v.union(v.string(), v.null()),
            route_color: v.union(v.string(), v.null()),
            stops: v.optional(v.array(v.string())),
            stop_count: v.optional(v.number()),
            transfers: v.optional(v.number()),
            shape_id: v.optional(v.string()),
          })
        ),
        transfer_routes: v.array(
          v.object({
            path: v.array(v.string()),
            routes: v.array(
              v.object({
                route_id: v.string(),
                route_name: v.union(v.string(), v.null()),
                route_short_name: v.union(v.string(), v.null()),
                route_color: v.union(v.string(), v.null()),
                from: v.string(),
                to: v.string(),
                shape_id: v.string(),
              })
            ),
            transfers: v.number(),
            total_stops: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const route of args.precomputedRoutes) {
      const result = await ctx.db.insert("precomputed_routes", route);
      results.push(result);
    }
    return { inserted: results.length, ids: results };
  },
});

// Helper function to check data counts
export const getDataCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const stationsCount = await ctx.db.query("stations").collect();
    const routesCount = await ctx.db.query("routes").collect();
    const shapesCount = await ctx.db.query("shapes").collect();
    const tripsCount = await ctx.db.query("trips").collect();
    const precomputedRoutesCount = await ctx.db.query("precomputed_routes").collect();
    
    return {
      stations: stationsCount.length,
      routes: routesCount.length,
      shapes: shapesCount.length,
      trips: tripsCount.length,
      precomputed_routes: precomputedRoutesCount.length,
    };
  },
}); 
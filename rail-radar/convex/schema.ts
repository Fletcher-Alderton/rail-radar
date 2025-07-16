import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  stations: defineTable({
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
  }),
  routes: defineTable({
    route_id: v.string(),
    route_type: v.string(),
    route_long_name: v.union(v.string(), v.null()),
    route_short_name: v.union(v.string(), v.null()),
  }),
  shapes: defineTable({
    shape_id: v.string(),
    points: v.array(
      v.object({
        lat: v.number(),
        lon: v.number(),
        sequence: v.number(),
      })
    ),
  }),
  trips: defineTable({
    trip_id: v.string(),
    route_id: v.string(),
    trip_headsign: v.string(),
    shape_id: v.string(),
  }),
  // New table for ticket inspector voting system
  votes: defineTable({
    station_id: v.string(), // References the station where the vote was cast
    vote_type: v.boolean(), // true for thumbs up, false for thumbs down
    created_at: v.number(), // Timestamp when vote was submitted (for expiration)
    user_id: v.string(), // User ID from auth identity (subject field)
  })
    .index("by_station", ["station_id"])
    .index("by_station_and_time", ["station_id", "created_at"])
    .index("by_user_and_station", ["user_id", "station_id"]),
  precomputed_routes: defineTable({
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
  }),
});

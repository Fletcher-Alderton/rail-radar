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
    // Renamed fields to match the new JSON structure
    name: v.string(),
    lat: v.number(),
    lon: v.number(),
    // Platforms are now simple string ids instead of object payloads
    platforms: v.array(v.string()),
  }).searchIndex("search_station_name", {
    searchField: "name",
  }),
  // Added edges table to represent the graph relationships between stations
  edges: defineTable({
    from_station: v.string(),
    to_station: v.string(),
    edge_type: v.string(),
    weight: v.number(),
    route_ids: v.array(v.string()),
    direction_id: v.number(),
  })
    .index("by_from_station", ["from_station"])
    .index("by_to_station", ["to_station"]),
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
  favorites: defineTable({
    user_id: v.string(),
    station_id: v.string(),
    created_at: v.number(), // optional, for sorting/history
  })
    .index("by_user", ["user_id"])
    .index("by_user_and_station", ["user_id", "station_id"]),

  // New table for row counts
  row_counts: defineTable({
    tableName: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_table", ["tableName"]),
  closest_stations: defineTable({
    station_id: v.string(),
    close_station_id: v.string(),
    distance: v.number(),
    route_ids: v.array(v.string()),
  }).index("by_station", ["station_id"]),
  route_to_stations: defineTable({
    route_id: v.string(),
    stations: v.array(v.string()),
  }).index("by_route", ["route_id"]),
});

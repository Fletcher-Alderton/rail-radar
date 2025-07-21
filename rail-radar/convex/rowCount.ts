import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateRowCounts = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const timestamp = Date.now();
    const tableNames = [
      "stations",
      "votes",
      "edges",
      "closest_stations",
      "route_to_stations",
    ] as const;
    for (const tableName of tableNames) {
      const rows = await ctx.db
        .query("row_counts")
        .withIndex("by_table", (q) => q.eq("tableName", tableName))
        .collect();
      const count = (await ctx.db.query(tableName).collect()).length;
      if (rows.length > 0) {
        await ctx.db.patch(rows[0]._id, { count, updatedAt: timestamp });
      } else {
        await ctx.db.insert("row_counts", { tableName, count, updatedAt: timestamp });
      }
    }
    return null;
  },
});

// get count of rows in a table
export const getRowCount = query({
  args: { tableName: v.union(v.literal("stations"), v.literal("edges"), v.literal("votes"), v.literal("closest_stations"), v.literal("route_to_stations")) },
  handler: async (ctx, args) => {
    return (await ctx.db.query(args.tableName).collect()).length;
  },
});
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const VOTE_EXPIRY_HOURS = 1;
const VOTE_EXPIRY_MS = VOTE_EXPIRY_HOURS * 60 * 60 * 1000;

// Get all stations with current vote counts
export const getAllStationsWithVotes = query({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db.query("stations").collect();
    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    // Get vote counts for each station
    const stationsWithVotes = await Promise.all(
      stations.map(async (station) => {
        // Get recent votes for this station
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_station", (q) => q.eq("station_id", station.station_id))
          .filter((q) => q.gte(q.field("created_at"), cutoffTime))
          .collect();

        // Count thumbs up (true) and thumbs down (false)
        const thumbsUp = votes.filter((vote) => vote.vote_type === true).length;
        const thumbsDown = votes.filter((vote) => vote.vote_type === false).length;

        return {
          ...station,
          thumbsUp,
          thumbsDown,
          totalVotes: thumbsUp + thumbsDown,
        };
      })
    );

    return stationsWithVotes;
  },
});

// Submit a vote for a station
export const submitVote = mutation({
  args: {
    station_id: v.string(),
    vote_type: v.boolean(), // true for thumbs up, false for thumbs down
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to vote");
    }

    // Use the subject from the identity as the user ID (standard Convex Auth pattern)
    const userId = identity.subject;

    // Check if user has voted recently for this station
    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;
    
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user_and_station", (q) =>
        q.eq("user_id", userId).eq("station_id", args.station_id)
      )
      .filter((q) => q.gte(q.field("created_at"), cutoffTime))
      .first();

    if (existingVote) {
      throw new Error("You have already voted for this station recently");
    }

    // Submit the vote
    const voteId = await ctx.db.insert("votes", {
      station_id: args.station_id,
      vote_type: args.vote_type,
      created_at: now,
      user_id: userId,
    });

    return voteId;
  },
});

// Get votes for a specific station
export const getStationVotes = query({
  args: {
    station_id: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_station", (q) => q.eq("station_id", args.station_id))
      .filter((q) => q.gte(q.field("created_at"), cutoffTime))
      .collect();

    const thumbsUp = votes.filter((vote) => vote.vote_type === true).length;
    const thumbsDown = votes.filter((vote) => vote.vote_type === false).length;

    return {
      thumbsUp,
      thumbsDown,
      totalVotes: thumbsUp + thumbsDown,
      votes,
    };
  },
}); 
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

const VOTE_EXPIRY_HOURS = 1;
const VOTE_EXPIRY_MS = VOTE_EXPIRY_HOURS * 60 * 60 * 1000;

// Search stations by name with pagination
export const searchStationsPaginated = query({
  args: {
    searchQuery: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    
    // Use the search index to find stations matching the query with pagination
    const paginated = await ctx.db
      .query("stations")
      .withSearchIndex("search_station_name", (q) =>
        q.search("name", args.searchQuery)
      )
      .paginate(args.paginationOpts);

    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    // Get user's favorites if authenticated
    const userFavorites = userId 
      ? await ctx.db
          .query("favorites")
          .withIndex("by_user", (q) => q.eq("user_id", userId))
          .collect()
      : [];
    
    const favoriteStationIds = new Set(userFavorites.map(f => f.station_id));

    // Get vote counts for each station
    const stationsWithVotes = await Promise.all(
      paginated.page.map(async (station) => {
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
          isFavorite: favoriteStationIds.has(station.station_id),
        };
      })
    );

    return {
      page: stationsWithVotes,
      continueCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
  },
});

// Search stations by name
export const searchStations = query({
  args: {
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    
    // Use the search index to find stations matching the query
    const stations = await ctx.db
      .query("stations")
      .withSearchIndex("search_station_name", (q) =>
        q.search("name", args.searchQuery)
      )
      .take(50); // Limit to 50 results for performance

    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    // Get user's favorites if authenticated
    const userFavorites = userId 
      ? await ctx.db
          .query("favorites")
          .withIndex("by_user", (q) => q.eq("user_id", userId))
          .collect()
      : [];
    
    const favoriteStationIds = new Set(userFavorites.map(f => f.station_id));

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
          isFavorite: favoriteStationIds.has(station.station_id),
        };
      })
    );

    return stationsWithVotes;
  },
});

// get count of stations
export const StationsCount = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stations").collect();
  },
});

// get count of favorites
export const FavoritesCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to view favorites");
    }
    const userId = identity.subject;
    return await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
  },
});

// Get all stations with current vote counts
export const getAllStationsWithVotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    
    const stations = await ctx.db.query("stations").collect();
    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    // Get user's favorites if authenticated
    const userFavorites = userId 
      ? await ctx.db
          .query("favorites")
          .withIndex("by_user", (q) => q.eq("user_id", userId))
          .collect()
      : [];
    
    const favoriteStationIds = new Set(userFavorites.map(f => f.station_id));

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
          isFavorite: favoriteStationIds.has(station.station_id),
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

// Get all favorites for a user
export const getUserFavorites = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    return favorites;
  },
});

// Get user's favorite stations with vote counts
export const getUserFavoriteStations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to view favorites");
    }

    const userId = identity.subject;
    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    // Get user's favorites
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();

    if (favorites.length === 0) {
      return [];
    }

    // Get the stations for these favorites
    const favoriteStationIds = favorites.map(f => f.station_id);
    const stations = await Promise.all(
      favoriteStationIds.map(async (stationId) => {
        const station = await ctx.db
          .query("stations")
          .filter((q) => q.eq(q.field("station_id"), stationId))
          .first();
        
        if (!station) return null;

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
          isFavorite: true, // Always true since these are the user's favorites
        };
      })
    );

    // Filter out null values and return
    return stations.filter(station => station !== null);
  },
});

// Add a favorite for a station
export const addFavorite = mutation({
  args: {
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to add a favorite");
    }

    const userId = identity.subject;

    // Check if user has already favorited this station
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_station", (q) =>
        q.eq("user_id", userId).eq("station_id", args.stationId)
      )
      .first();

    if (existingFavorite) {
      throw new Error("You have already favorited this station");
    }

    // Add the favorite
    const favoriteId = await ctx.db.insert("favorites", {
      user_id: userId,
      station_id: args.stationId,
      created_at: Date.now(),
    });

    return favoriteId;
  },
});

// Remove a favorite for a station
export const removeFavorite = mutation({
  args: {
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to remove a favorite");
    }

    const userId = identity.subject;

    // Check if user has favorited this station
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_station", (q) =>
        q.eq("user_id", userId).eq("station_id", args.stationId)
      )
      .first();

    if (!existingFavorite) {
      throw new Error("You have not favorited this station");
    }

    // Remove the favorite
    await ctx.db.delete(existingFavorite._id);

    return true;
  },
});
// Paginated queries for infinite scroll
export const getAllStationsWithVotesPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    const paginated = await ctx.db
      .query("stations")
      .paginate(args.paginationOpts);

    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    const userFavorites = userId
      ? await ctx.db
          .query("favorites")
          .withIndex("by_user", (q) => q.eq("user_id", userId))
          .collect()
      : [];
    const favoriteStationIds = new Set(
      userFavorites.map((f) => f.station_id)
    );

    const stations = paginated.page;

    const stationsWithVotes = await Promise.all(
      stations.map(async (station) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_station", (q) =>
            q.eq("station_id", station.station_id)
          )
          .filter((q) => q.gte(q.field("created_at"), cutoffTime))
          .collect();

        const thumbsUp = votes.filter((vote) => vote.vote_type === true)
          .length;
        const thumbsDown = votes.filter((vote) => vote.vote_type === false)
          .length;

        return {
          ...station,
          thumbsUp,
          thumbsDown,
          totalVotes: thumbsUp + thumbsDown,
          isFavorite: favoriteStationIds.has(station.station_id),
        };
      })
    );

    return {
      page: stationsWithVotes,
      continueCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
  },
});

export const getUserFavoriteStationsPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to view favorites");
    }

    const userId = identity.subject;
    const paginatedFavorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const favorites = paginatedFavorites.page;
    const now = Date.now();
    const cutoffTime = now - VOTE_EXPIRY_MS;

    const stationsWithVotes = await Promise.all(
      favorites.map(async (fav) => {
        const station = await ctx.db
          .query("stations")
          .filter((q) => q.eq(q.field("station_id"), fav.station_id))
          .first();
        if (!station) return null;
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_station", (q) =>
            q.eq("station_id", station.station_id)
          )
          .filter((q) => q.gte(q.field("created_at"), cutoffTime))
          .collect();
        const thumbsUp = votes.filter((vote) => vote.vote_type === true)
          .length;
        const thumbsDown = votes.filter((vote) => vote.vote_type === false)
          .length;
        return {
          ...station,
          thumbsUp,
          thumbsDown,
          totalVotes: thumbsUp + thumbsDown,
          isFavorite: true,
        };
      })
    );

    return {
      page: stationsWithVotes.filter((s) => s !== null),
      continueCursor: paginatedFavorites.continueCursor,
      isDone: paginatedFavorites.isDone,
    };
  },
});
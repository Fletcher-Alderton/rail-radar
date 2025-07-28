export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL,
      applicationID: "convex",
    },
  ],
  // Add session configuration
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
};

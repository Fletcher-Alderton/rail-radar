export default {
  providers: [
    {
      domain: process.env.NEXT_PUBLIC_CONVEX_URL 
        ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).origin
        : "http://localhost:3000",
      applicationID: "convex",
    },
  ],
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
};

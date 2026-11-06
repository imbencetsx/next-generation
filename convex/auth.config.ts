// A Convex Auth saját JWT-it fogadjuk el; enélkül ctx.auth mindig null.
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // A munkafelület korábbi címe; a régi linkek (a lekérdezési paraméterekkel együtt) továbbra is működnek.
  async redirects() {
    return [{ source: "/test/:path*", destination: "/workbench/:path*", permanent: false }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

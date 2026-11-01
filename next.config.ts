import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep native/binary packages out of the bundler (required for
  // Prisma + libSQL on Vercel builds)
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;

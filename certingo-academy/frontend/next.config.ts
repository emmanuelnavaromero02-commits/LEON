import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle (.next/standalone) for small,
  // dependency-free production Docker images.
  output: "standalone",
};

export default nextConfig;

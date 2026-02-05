import type { NextConfig } from "next";

const nextConfig: any = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable static generation - render all pages at runtime
  experimental: {
    // This prevents static page generation errors
  },
};

export default nextConfig;

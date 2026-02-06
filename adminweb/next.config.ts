import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

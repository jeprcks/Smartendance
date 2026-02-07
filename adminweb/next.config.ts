import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: true,
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!backend) return [];
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;

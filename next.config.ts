import type { NextConfig } from "next";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
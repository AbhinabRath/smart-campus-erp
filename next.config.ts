import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Proxy API requests to the Express backend on port 3001.
  // This is necessary because the browser connects to port 3000 (Next.js),
  // but the backend API runs on port 3001. These rewrites ensure API calls
  // are forwarded to the correct backend server.
 async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3001/api/:path*',
    },

    {
      source: '/uploads/:path*',
      destination: 'http://localhost:3001/uploads/:path*',
    },
  ];
},
};

export default nextConfig;

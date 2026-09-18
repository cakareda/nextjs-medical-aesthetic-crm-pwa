import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.1.24:3000', 'localhost:3000'],
    },
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@prisma/client'],
  logging: {
    fetches: {
      fullUrl: true
    }
  },
  output: 'standalone'
};

export default nextConfig;

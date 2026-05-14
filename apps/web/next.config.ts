import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@ritual-mirror/ritual"]
};

export default nextConfig;

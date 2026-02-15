import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mycoach/shared"],
  // Disable dev indicator (Segment Explorer) to avoid React Client Manifest bug
  // with next-devtools in dev. See: next-devtools segment-explorer-node.js#SegmentViewNode
  devIndicators: false,
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root so multiple lockfiles outside the project don't confuse detection.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

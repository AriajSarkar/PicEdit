import type { NextConfig } from "next";

// Only set basePath for GitHub Pages. Vercel serves at root "/".
// Set PAGES_BASE_PATH="/PicEdit" in the GH Pages workflow; leave unset elsewhere.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;

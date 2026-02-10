import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isProd ? "/PicEdit" : "",
  assetPrefix: isProd ? "/PicEdit/" : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? "/PicEdit" : "",
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/im-digital",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

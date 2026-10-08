import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Next.js only auto-loads env files from the project root. Load the private
// backend file before the app or build reads any server credentials.
loadEnv({ path: resolve(process.cwd(), "src/backend/.env"), override: false });

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

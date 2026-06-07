import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are server-only packages with Node-native deps; keep them external so
  // Next does not try to bundle them into the server build.
  serverExternalPackages: ["@mastra/core", "@mastra/loggers", "pdfmake", "mammoth", "xlsx"],
};

export default nextConfig;

import type { NextConfig } from "next";

// Standalone output is needed for Electron (bundles a Node.js server).
// Vercel handles its own output, so skip standalone there.
const isVercel = process.env.VERCEL === "1" || process.env.CI === "true";

const nextConfig: NextConfig = {
  output: isVercel ? undefined : "standalone",
  serverExternalPackages: ["@livekit/rtc-node", "ws"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self), autoplay=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self), geolocation=(self), screen-wake-lock=(self), picture-in-picture=(self)",
          },
          {
            // iOS-friendly meta-equivalent via header (some mobile browsers respect this)
            key: "Accept-CH",
            value: "Sec-CH-UA-Platform",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

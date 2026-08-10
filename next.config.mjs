/** @type {import('next').NextConfig} */
const nextConfig = {
  // Selfies are sent as base64 JSON to the API routes; allow a larger body.
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;

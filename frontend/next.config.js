/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // App Router is stable in Next 14 — keep this for future-proofing
  },
  // Proxy API calls to the FastAPI backend in dev
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
  // Production image optimisation
  images: {
    domains: [],
  },
};

module.exports = nextConfig;

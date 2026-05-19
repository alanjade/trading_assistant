import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/favicon.ico',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/fonts/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=60, stale-while-revalidate=30',
        },
      ],
    },
  ],
  // Use server-side rendering only where needed. This app already keeps
  // the main dashboard in client boundaries and uses `revalidate = 60` for
  // the page-level cache strategy.
};

export default nextConfig;

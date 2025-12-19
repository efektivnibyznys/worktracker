import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Code splitting pro recharts a d3 knihovny
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        cacheGroups: {
          ...(config.optimization?.splitChunks as any)?.cacheGroups,
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
            name: 'recharts',
            priority: 10,
            chunks: 'all',
          },
        },
      },
    };
    return config;
  },
};

export default nextConfig;

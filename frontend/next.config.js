/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silence the conflict warning and enable Turbopack
  turbopack: {},
  experimental: {
    turbo: {
      resolveAlias: {
        'thread-stream': './app/stubs/thread-stream.js',
      },
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };
    config.externals.push(
      'pino-pretty',
      'lokijs',
      'encoding',
      '@react-native-async-storage/async-storage'
    );
    return config;
  },
};

module.exports = nextConfig;

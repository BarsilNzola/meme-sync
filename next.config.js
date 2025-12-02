// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack to use traditional webpack
  experimental: {
    turbo: {
      resolveAlias: {
        // Exclude problematic modules
        'thread-stream': false,
        'pino': false,
        'pino-pretty': false,
      },
    },
  },
  
  webpack: (config, { isServer }) => {
    // Ignore specific modules
    config.externals = [
      ...(config.externals || []),
      'thread-stream',
      'pino',
      'pino-pretty',
      'sonic-boom',
      'tap',
      'tape',
      'why-is-node-running',
      'fastbench',
      'desm',
      'pino-elasticsearch',
    ];

    // Handle problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
      child_process: false,
      worker_threads: false,
    };

    // Ignore test files and other problematic files
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts|tsx)$/,
      loader: 'ignore-loader',
    });

    config.module.rules.push({
      test: /\.md$/,
      loader: 'ignore-loader',
    });

    config.module.rules.push({
      test: /\.(zip|bin|exe|sh)$/,
      loader: 'ignore-loader',
    });

    // Exclude node_modules from being processed for certain packages
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'thread-stream': false,
        'pino': false,
        'pino-pretty': false,
      };
    }

    return config;
  },
}

module.exports = nextConfig;
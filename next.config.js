// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  
  webpack: (config, { isServer, webpack }) => {
    // Prevent processing of problematic Node.js modules
    if (!isServer) {
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
    }

    // Exclude problematic modules from being bundled
    config.externals = [
      ...(config.externals || []),
      // Add problematic modules as external
      function ({ context, request }, callback) {
        // Exclude thread-stream and related modules
        if (/thread-stream|pino|pino-pretty|sonic-boom|tap|tape|why-is-node-running|fastbench|desm|pino-elasticsearch/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      }
    ];

    // Ignore test files
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts|tsx|mjs)$/,
      loader: 'ignore-loader',
    });

    // Ignore non-JS files that cause issues
    config.module.rules.push({
      test: /\.(md|zip|bin|exe|sh)$/,
      loader: 'ignore-loader',
    });

    // Ignore LICENSE files
    config.module.rules.push({
      test: /LICENSE$/,
      loader: 'ignore-loader',
    });

    return config;
  },
}

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack explicitly to avoid conflicts
  turbopack: false,
  
  // No need for serverExternalPackages or complex webpack config
  // since FFmpeg is now client-side only
  
  // Only include this if you're using other server-only packages
  webpack: (config, { isServer }) => {
    // Client-side config only
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        child_process: false,
      };
    }
    return config;
  },
  
  // Optional: Increase timeout for build if needed
  staticPageGenerationTimeout: 300,
  
  // Enable server actions if needed for Story Protocol API routes
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
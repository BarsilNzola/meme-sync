/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove all experimental and api sections
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
    };
    return config;
  },
}

module.exports = nextConfig
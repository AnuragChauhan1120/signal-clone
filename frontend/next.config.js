/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8001';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

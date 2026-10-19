/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mkt/shared'],
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost', port: '9000' }],
  },
};

export default nextConfig;

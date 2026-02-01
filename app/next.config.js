/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  basePath: '/dragons-riddle-vault',
  assetPrefix: '/dragons-riddle-vault/',
}

module.exports = nextConfig

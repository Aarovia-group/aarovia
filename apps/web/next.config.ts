import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname, '../..') },
  experimental: { serverActions: { allowedOrigins: ['localhost:3000', 'https://aarovia.co.in', 'https://www.aarovia.co.in'] } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'aarovia.co.in' }],
        destination: 'https://www.aarovia.co.in/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://www.aarovia.co.in/:path*',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ||
      (process.env.NODE_ENV === 'production' ? 'https://api.aarovia.co.in' : 'http://localhost:5000')
    const apiUrl = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
    const destination = `${apiUrl}/api/:path*`

    return [
      { source: '/api/:path*', destination },
    ]
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxies API calls through this app's own origin so the auth cookie is
  // first-party from the browser's perspective. Without this, frontend
  // (Vercel) and backend (Render) are different domains and the cookie is
  // a third-party cookie that Chrome (and Safari) block by default,
  // regardless of SameSite/Secure - confirmed in production, not just a
  // theoretical risk. BACKEND_URL is server-only (no NEXT_PUBLIC_ prefix -
  // this runs in Next's server layer, never shipped to the browser).
  async rewrites() {
    if (!process.env.BACKEND_URL) {
      return []
    }
    return [
      { source: '/user/:path*', destination: `${process.env.BACKEND_URL}/user/:path*` },
      { source: '/api/:path*', destination: `${process.env.BACKEND_URL}/api/:path*` },
    ]
  },
}

export default nextConfig

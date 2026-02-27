/** @type {import('next').NextConfig} */
const nextConfig = {
  // 关闭TypeScript检查（如果使用JavaScript）
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint 检查（可选）
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig

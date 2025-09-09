/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포를 위한 standalone 출력
  output: 'standalone',
  
  // 환경 변수 설정
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    BAPP_API_KEY: process.env.BAPP_API_KEY,
  },
  
  // 이미지 최적화 설정
  images: {
    unoptimized: true,
  },
  
  // EC2에서만 타입체크 스킵
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_TYPE_CHECK === 'true',
  },
}

module.exports = nextConfig

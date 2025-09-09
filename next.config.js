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
}

module.exports = nextConfig

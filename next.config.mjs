import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    output: 'standalone', // 메모리 최적화: standalone 모드
    serverExternalPackages: ['@prisma/client', 'prisma'],
    // 프로덕션에서 로깅 비활성화
    logging: process.env.NODE_ENV === 'production' ? undefined : {
        fetches: {
            fullUrl: true
        }
    },
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
    // Next.js 16 Turbopack 설정
    turbopack: {
        resolveAlias: {
            '@': path.join(__dirname, 'src'),
        },
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': path.join(__dirname, 'src'),
            '@react-native-async-storage/async-storage': false,
        };
        return config;
    }
};

export default nextConfig;

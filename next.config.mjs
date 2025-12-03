/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    serverExternalPackages: ['@prisma/client'],
    logging: {
        fetches: {
            fullUrl: true
        }
    },
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@react-native-async-storage/async-storage': false,
        };
        return config;
    }
};

export default nextConfig;

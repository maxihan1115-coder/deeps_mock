import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log('🔌 Initializing Prisma client...');
console.log('🌐 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

console.log('✅ Prisma client initialized');

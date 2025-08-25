import { PrismaClient } from '@prisma/client';
import { URL } from 'node:url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log('🔌 Initializing Prisma client...');
const rawDatabaseUrl = process.env.DATABASE_URL;
console.log('🌐 Database URL:', rawDatabaseUrl ? 'Set' : 'Not set');

// 추가 진단 로그: 호스트/포트/DB명 표시 (비밀번호는 마스킹)
if (rawDatabaseUrl) {
  try {
    const parsed = new URL(rawDatabaseUrl);
    const maskedAuth = parsed.username
      ? `${parsed.username}:${parsed.password ? '***' : ''}`
      : '';
    console.log(
      '🔎 DB parsed =>',
      `protocol=${parsed.protocol.replace(':', '')}, host=${parsed.hostname}, port=${parsed.port || '(default)'}, db=${parsed.pathname.replace('/', '')}, auth=${maskedAuth ? '(set)' : '(none)'}`
    );
    if (!parsed.protocol.startsWith('mysql')) {
      console.error('❌ DATABASE_URL must start with mysql://');
    }
    if (parsed.port && parsed.port !== '30079') {
      console.warn('⚠️ Unexpected DB port detected:', parsed.port, '(expected 30079)');
    }
  } catch (e) {
    console.error('❌ DATABASE_URL parse error:', e instanceof Error ? e.message : e);
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

console.log('✅ Prisma client initialized');

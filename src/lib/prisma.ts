import { PrismaClient } from '@prisma/client';
import { URL } from 'node:url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log('🔌 Initializing Prisma client...');
// ENV 정규화: 양쪽 따옴표/공백 제거
const rawDatabaseUrl = process.env.DATABASE_URL;
let normalizedDatabaseUrl = rawDatabaseUrl
  ? rawDatabaseUrl.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
  : undefined;
console.log('🌐 Database URL:', normalizedDatabaseUrl ? 'Set' : 'Not set');

// 추가 진단 로그: 호스트/포트/DB명 표시 (비밀번호는 마스킹)
if (normalizedDatabaseUrl) {
  try {
    const parsed = new URL(normalizedDatabaseUrl);
    // DB명이 비어 있으면 기본 DB명 보충
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/deeps_mock';
      normalizedDatabaseUrl = parsed.toString();
    }
    // 일부 MySQL 변형에서 prepared statements 제약 회피
    if (!parsed.searchParams.has('planetscale_mode')) {
      parsed.searchParams.set('planetscale_mode', 'true');
      normalizedDatabaseUrl = parsed.toString();
    }
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

let prismaClient: PrismaClient;

try {
  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: normalizedDatabaseUrl
      ? { db: { url: normalizedDatabaseUrl } }
      : undefined,
  });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
  
  console.log('✅ Prisma client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error);
  throw new Error('Prisma client initialization failed');
}

export const prisma = prismaClient;

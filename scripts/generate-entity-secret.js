#!/usr/bin/env node

/**
 * Circle Entity Secret 생성 스크립트
 * 
 * Entity Secret은 32바이트 랜덤 값으로 생성됩니다.
 * 이 값은 안전하게 보관되어야 하며, Circle Console에도 등록되어야 합니다.
 */

const crypto = require('crypto');

// 32바이트 (256비트) 랜덤 Entity Secret 생성
const entitySecret = crypto.randomBytes(32).toString('hex');

console.log('🔐 Circle Entity Secret 생성 완료!\n');
console.log('아래 값을 .env 파일에 추가하세요:\n');
console.log(`CIRCLE_ENTITY_SECRET="${entitySecret}"\n`);
console.log('⚠️  주의사항:');
console.log('1. 이 값은 안전하게 보관하세요');
console.log('2. Git에 커밋하지 마세요');
console.log('3. Circle Console에서도 동일한 값을 설정해야 합니다\n');

// Base64 인코딩된 값도 출력 (Circle API에서 사용)
const entitySecretBase64 = Buffer.from(entitySecret, 'hex').toString('base64');
console.log('Base64 인코딩 값 (Circle API용):');
console.log(entitySecretBase64);

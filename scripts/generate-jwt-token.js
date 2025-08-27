const jwt = require('jsonwebtoken');

// JWT Secret (실제 환경에서는 환경 변수에서 가져와야 함)
const JWT_SECRET = "your_jwt_secret_key_here_make_it_long_and_random";

// 토큰에 포함할 정보
const payload = {
  gameUuid: 123, // 실제 게임 UUID
  platformType: 'BAPP',
  platformUuid: 'bapp_123',
};

// JWT 토큰 생성 (3년 만료)
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '3y' });

console.log('=== JWT 토큰 생성 완료 ===');
console.log('토큰:', token);
console.log('만료 시간: 3년');
console.log('포함 정보:', JSON.stringify(payload, null, 2));
console.log('========================');

// 토큰 검증 테스트
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('토큰 검증 성공:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('토큰 검증 실패:', error.message);
}

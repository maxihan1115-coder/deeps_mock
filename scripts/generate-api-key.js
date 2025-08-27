const crypto = require('crypto');

// API Key 생성 (32자리 랜덤 문자열)
const apiKey = crypto.randomBytes(32).toString('hex');

console.log('=== BAPP API Key 생성 완료 ===');
console.log('API Key:', apiKey);
console.log('길이:', apiKey.length, '자');
console.log('============================');

console.log('\n=== 환경 변수 설정 ===');
console.log('BAPP_AUTH_TOKEN=' + apiKey);
console.log('=====================');

console.log('\n=== 사용 예시 ===');
console.log('curl -X GET http://56.228.20.205:3000/api/auth/token?gameUuid=7 \\');
console.log('  -H "Authorization: Bearer ' + apiKey + '"');
console.log('==================');

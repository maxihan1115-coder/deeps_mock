-- 중복된 지갑 주소 확인 스크립트
-- Prisma Studio에서 실행하거나 MySQL 클라이언트에서 실행

-- 1. 중복된 address 찾기
SELECT 
    address, 
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(userId) as user_ids,
    GROUP_CONCAT(id) as wallet_ids
FROM external_wallets 
GROUP BY address 
HAVING COUNT(*) > 1;

-- 2. 중복 제거 방법 옵션 A: userId가 더 큰 것 삭제 (최신 것 유지)
-- DELETE FROM external_wallets 
-- WHERE id NOT IN (
--     SELECT id FROM (
--         SELECT MIN(id) as id
--         FROM external_wallets
--         GROUP BY address
--     ) as keeper
-- );

-- 3. 중복 제거 방법 옵션 B: isPrimary가 true인 것 우선 유지
-- 수동으로 확인 후 삭제할 ID를 지정
-- DELETE FROM external_wallets WHERE id IN ('id1', 'id2', ...);

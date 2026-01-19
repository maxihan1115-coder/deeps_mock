#!/bin/bash

# ======================================
# DeepMock 배포 스크립트 (Standalone 모드)
# ======================================

# 설정
EC2_HOST="43.202.230.37"
EC2_USER="ec2-user"
KEY_PATH="./qa-server.pem"
REMOTE_DIR="/home/ec2-user/deeps_mock"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 배포 시작: Next.js Standalone 모드${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# SSH 테스트
echo -e "${YELLOW}📡 SSH 연결 테스트...${NC}"
if ! ssh -i $KEY_PATH -o ConnectTimeout=10 -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ SSH 연결 실패! EC2 상태를 확인하세요.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH 연결 성공${NC}"

# 1. 로컬 빌드
echo ""
echo -e "${YELLOW}📦 Step 1: 로컬 빌드${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 빌드 완료${NC}"

# 2. Standalone 폴더 전송 (node_modules 포함)
echo ""
echo -e "${YELLOW}📤 Step 2: Standalone 폴더 전송 (의존성 포함)${NC}"
rsync -avz --delete -e "ssh -i $KEY_PATH" \
    .next/standalone/ \
    $EC2_USER@$EC2_HOST:$REMOTE_DIR/.next/standalone/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Standalone 폴더 전송 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Standalone 폴더 전송 완료${NC}"

# 3. Static 파일 전송
echo ""
echo -e "${YELLOW}📤 Step 3: Static 파일 전송${NC}"
rsync -avz -e "ssh -i $KEY_PATH" \
    .next/static \
    $EC2_USER@$EC2_HOST:$REMOTE_DIR/.next/standalone/.next/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Static 파일 전송 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Static 파일 전송 완료${NC}"

# 4. Public 폴더 전송
echo ""
echo -e "${YELLOW}📤 Step 4: Public 폴더 전송${NC}"
rsync -avz -e "ssh -i $KEY_PATH" \
    public \
    $EC2_USER@$EC2_HOST:$REMOTE_DIR/.next/standalone/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Public 폴더 전송 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Public 폴더 전송 완료${NC}"

# 5. PM2 재시작
echo ""
echo -e "${YELLOW}🔄 Step 5: PM2 재시작${NC}"
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST << 'EOF'
    cd /home/ec2-user/deeps_mock
    
    # NVM 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # PM2 재시작 (없으면 새로 시작)
    if pm2 describe deeps-mock > /dev/null 2>&1; then
        pm2 restart deeps-mock
    else
        pm2 start .next/standalone/server.js --name "deeps-mock"
        pm2 save
    fi
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PM2 재시작 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PM2 재시작 완료${NC}"

# 6. 헬스체크
echo ""
echo -e "${YELLOW}🔍 Step 6: 헬스체크${NC}"
sleep 3

HEALTH=$(curl -s --connect-timeout 10 http://$EC2_HOST:3000/api/health)
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ 서버 상태: healthy${NC}"
    echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
else
    echo -e "${YELLOW}⚠️  서버 상태 확인 필요:${NC}"
    echo "$HEALTH"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${GREEN}   URL: http://$EC2_HOST:3000${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

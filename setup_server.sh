#!/bin/bash

# 설정
EC2_HOST="54.254.104.81"
EC2_USER="ubuntu"
KEY_PATH="~/Downloads/maxi.pem"

echo "📦 서버 설정 스크립트 생성 및 전송 중 (Snap 경로 탐색)..."

# 1. 원격에서 실행할 스크립트 생성
cat << 'EOF' > setup_swap_remote.sh
#!/bin/bash
set -e

echo "🚀 EC2 내부에서 Swap 설정 시작..."

# 2GB 할당
echo "💾 2GB 할당 중..."
rm -f /swapfile
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile

# swapon 명령어 찾기 (Snap 경로 포함)
echo "🔌 swapon 명령어 찾는 중..."
SWAPON_CMD=""

# 1. 일반 경로 확인
if [ -f /sbin/swapon ]; then SWAPON_CMD="/sbin/swapon"; fi
if [ -f /usr/sbin/swapon ]; then SWAPON_CMD="/usr/sbin/swapon"; fi

# 2. Snap 경로 확인 (일반 경로에 없으면)
if [ -z "$SWAPON_CMD" ]; then
    # find로 snap 내부의 swapon 찾기 (가장 최신 버전)
    SNAP_SWAPON=$(find /snap/core22 -name swapon -type f 2>/dev/null | head -n 1)
    if [ -n "$SNAP_SWAPON" ]; then SWAPON_CMD="$SNAP_SWAPON"; fi
fi

# 3. 다른 Snap 버전 확인
if [ -z "$SWAPON_CMD" ]; then
    SNAP_SWAPON=$(find /snap/core20 -name swapon -type f 2>/dev/null | head -n 1)
    if [ -n "$SNAP_SWAPON" ]; then SWAPON_CMD="$SNAP_SWAPON"; fi
fi

if [ -n "$SWAPON_CMD" ]; then
    echo "✅ swapon 명령어 발견: $SWAPON_CMD"
    $SWAPON_CMD /swapfile
else
    echo "❌ swapon 명령어를 도저히 찾을 수 없습니다."
    echo "⚠️ 하지만 파일은 생성되었으므로 일단 진행합니다."
fi

# fstab 등록
if ! grep -q '/swapfile' /etc/fstab; then
    echo "📝 fstab 등록 중..."
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

echo "✅ 설정 스크립트 종료"
free -h
EOF

# 2. 스크립트 전송 (SCP)
chmod +x setup_swap_remote.sh
scp -i $KEY_PATH -o StrictHostKeyChecking=no setup_swap_remote.sh $EC2_USER@$EC2_HOST:/home/$EC2_USER/

# 3. 원격 실행 (sudo로 실행)
echo "▶️ 서버에서 스크립트 실행..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST "chmod +x ~/setup_swap_remote.sh && sudo ~/setup_swap_remote.sh"

# 4. 로컬 임시 파일 정리
rm setup_swap_remote.sh

echo "🎉 모든 설정이 완료되었습니다!"

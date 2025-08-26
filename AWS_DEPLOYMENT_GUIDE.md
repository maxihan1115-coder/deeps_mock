# 🚀 AWS EC2 + Docker 배포 가이드

## 📋 사전 준비사항

### 1. AWS 계정 및 EC2 인스턴스
- AWS 계정 생성
- EC2 인스턴스 생성 (Ubuntu 22.04 LTS 권장)
- 보안 그룹 설정 (포트 22, 80, 443, 3000 열기)

### 2. 도메인 설정 (선택사항)
- Route 53에서 도메인 구매 또는 기존 도메인 연결
- SSL 인증서 설정 (Let's Encrypt 권장)

## 🔧 EC2 인스턴스 설정

### 1. SSH 접속
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. 시스템 업데이트
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Docker 설치
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 4. Git 설치
```bash
sudo apt install git -y
```

## 📦 애플리케이션 배포

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-username/deeps_mock.git
cd deeps_mock
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
cat > .env << EOF
DATABASE_URL="mysql://username:password@your-db-host:3306/deeps_mock?planetscale_mode=true"
BAPP_API_KEY="your-bapp-api-key"
NODE_ENV=production
EOF
```

### 3. 배포 스크립트 실행 권한 부여
```bash
chmod +x deploy.sh
```

### 4. 애플리케이션 배포
```bash
./deploy.sh
```

## 🌐 도메인 및 SSL 설정 (선택사항)

### 1. Nginx 설치 및 설정
```bash
sudo apt install nginx -y

# Nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/deeps-mock << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/deeps-mock /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. SSL 인증서 설정 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 🔍 모니터링 및 로그

### 1. 컨테이너 상태 확인
```bash
docker-compose ps
docker-compose logs -f
```

### 2. 헬스체크 확인
```bash
curl http://localhost:3000/api/health
```

### 3. 애플리케이션 접속 테스트
```bash
curl http://your-domain.com
```

## 🔄 업데이트 및 유지보수

### 1. 코드 업데이트
```bash
git pull origin main
./deploy.sh
```

### 2. 백업
```bash
# 데이터베이스 백업 (필요시)
docker exec -it deeps-mock-db mysqldump -u root -p deeps_mock > backup.sql
```

### 3. 로그 로테이션
```bash
# Docker 로그 크기 제한
sudo tee /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

## 🚨 문제 해결

### 1. 포트 충돌
```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :3000
```

### 2. 메모리 부족
```bash
# 메모리 사용량 확인
free -h
docker system prune -a
```

### 3. 디스크 공간 부족
```bash
# 디스크 사용량 확인
df -h
docker system prune -a --volumes
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Docker 로그: `docker-compose logs`
2. Nginx 로그: `sudo tail -f /var/log/nginx/error.log`
3. 시스템 로그: `sudo journalctl -u docker`

## 🎯 BApp 연동

배포 완료 후:
- 호스트 URL: `https://your-domain.com`
- API 엔드포인트: `https://your-domain.com/api/quest/*`
- BApp에서 연동 테스트 진행

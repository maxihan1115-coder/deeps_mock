# 테트리스 목업 게임

내부 플랫폼 연동 QA를 위한 목업 테트리스 게임입니다.

## 주요 기능

### 🎮 게임 기능
- **테트리스 게임**: 완전한 테트리스 게임 구현
- **키보드 컨트롤**: 화살표 키로 블록 이동, 스페이스바로 회전
- **점수 시스템**: 라인 제거에 따른 점수 계산
- **레벨 시스템**: 점수에 따른 레벨 상승

### 👤 인증 시스템
- **간편 로그인**: 사용자명만으로 로그인 가능
- **자동 계정 생성**: 새로운 사용자명으로 자동 계정 생성
- **UUID 시스템**: 각 계정마다 고유 UUID 발급
- **패스워드 무시**: 패스워드 입력하지 않아도 로그인 가능

### 📅 출석체크
- **일일 출석**: 로그인 시 자동으로 일일 출석체크
- **중복 방지**: 하루에 한 번만 출석체크 가능

### 🏆 퀘스트 시스템
- **7개 퀘스트**: 다양한 유형의 퀘스트 제공
  - **일일 퀘스트**: 하루에 한 번 게임 플레이, 1000점 달성
  - **주간 퀘스트**: 일주일에 7번 게임 플레이, 10000점 달성
  - **월간 퀘스트**: 한 달에 30번 게임 플레이
  - **단일 퀘스트**: 첫 게임 플레이, 10000점 달성
- **자동 진행도 업데이트**: 게임 플레이와 점수에 따른 자동 업데이트

### 🔗 계정 연동
- **임시 코드 시스템**: UUIDv4 형식의 15분 유효 임시 코드
- **외부 브라우저 연동**: 인앱브라우저에서 외부 브라우저로 이동
- **플랫폼 연동**: 플랫폼과의 Server-to-Server 통신

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인

### 퀘스트
- `GET /api/quests?userId={userId}` - 퀘스트 조회
- `POST /api/quests/progress` - 퀘스트 진행도 업데이트

### 계정 연동
- `GET /api/account-link/request-code?uuid={uuid}` - 임시 코드 요청
- `POST /api/account-link/verify` - 계정 연동 검증

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가:
```env
# API 인증 정보
API_AUTHORIZATION=Basic a3dhaVRXNXdYUmdUdng5eTpUZTFpNG1VWmk0UlFvUFZjeVYzN0Y0eERXd2RGczVCQw==

# 플랫폼 URL
PLATFORM_URL=https://www.boradeeps.cc

# API URL
API_URL=https://api.boradeeps.cc

# 서버 포트
PORT=3000
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 브라우저에서 접속
```
http://localhost:3000
```

## 사용법

### 1. 로그인
- 사용자명을 입력하고 로그인
- 새로운 사용자명으로 자동 계정 생성
- 패스워드는 선택사항 (입력하지 않아도 됨)

### 2. 게임 플레이
- 화살표 키로 블록 이동
- 스페이스바로 블록 회전
- 라인을 완성하여 점수 획득

### 3. 퀘스트 확인
- 우측 사이드바에서 퀘스트 진행도 확인
- 게임 플레이와 점수에 따른 자동 업데이트

### 4. 계정 연동
- "계정 연동" 버튼 클릭
- 임시 코드 요청
- 외부 브라우저에서 플랫폼 로그인
- 연동 완료

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Data Storage**: In-Memory Storage (개발용)

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── auth/          # 인증 관련 API
│   │   ├── quests/        # 퀘스트 관련 API
│   │   └── account-link/  # 계정 연동 관련 API
│   ├── game/              # 게임 페이지
│   └── page.tsx           # 메인 페이지 (로그인)
├── components/            # React 컴포넌트
│   ├── ui/               # ShadCN UI 컴포넌트
│   ├── TetrisGame.tsx    # 테트리스 게임 컴포넌트
│   ├── LoginForm.tsx     # 로그인 폼 컴포넌트
│   ├── QuestPanel.tsx    # 퀘스트 패널 컴포넌트
│   └── AccountLink.tsx   # 계정 연동 컴포넌트
├── lib/                  # 유틸리티 및 저장소
│   ├── store.ts          # 게임 데이터 저장소
│   └── utils.ts          # 유틸리티 함수
└── types/                # TypeScript 타입 정의
    └── index.ts          # 타입 정의
```

## 개발 참고사항

### 데이터 저장
- 현재는 인메모리 저장소 사용 (서버 재시작 시 데이터 초기화)
- 프로덕션에서는 Redis나 데이터베이스 사용 권장

### 보안
- 현재는 개발용 목업이므로 보안 기능 제한적
- 프로덕션에서는 적절한 인증/인가 시스템 구현 필요

### 확장성
- 모듈화된 구조로 새로운 기능 추가 용이
- API 엔드포인트 확장 가능
- 새로운 게임 모드나 퀘스트 타입 추가 가능

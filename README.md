# AlphaFlow US v2 - 투자 성향 기반 백테스팅 체험 플랫폼

사용자의 투자 성향을 퀴즈로 진단하고, 실제 과거 시장 상황에서의 매매 판단을 시뮬레이션하여 보정된 투자 전략을 제시하는 AI 기반 플랫폼입니다.

## 주요 기능

### 1. 투자 성향 퀴즈
- **기본 질문 (Q1~Q5)**: 투자 목적, 기간, 손실 허용도, 경험, 성향
- **용어 체크 (T1~T5)**: MDD, 샤프 비율, 리밸런싱, 섹터 로테이션, 레버리지 ETF
- **고급 질문 (Q6~Q10)**: 전문가용 세부 설정 (섹터 선호, MDD 한도, 리밸런싱 주기 등)
- **위험 점수 산출**: 0~100 스케일의 위험 성향 점수

### 2. 전략 매핑
| 점수 | 전략 | 자산 배분 | 특징 |
|------|------|-----------|------|
| 0~20 | 안전제일 거북이 🐢 | 주식:채권:현금 = 20:60:20 | 원금 보호 최우선 |
| 21~40 | 신중한 부엉이 🦉 | 40:45:15 | 안정성 중시, 완만한 성장 |
| 41~60 | 균형잡힌 여우 🦊 | 60:30:10 | 위험과 수익의 균형 |
| 61~80 | 공격적인 사자 🦁 | 80:15:5 | 적극적 위험 감수 |
| 81~100 | 달나라 고양이 🐱 | 95:5:0 | 최대 수익 추구 (YOLO) |

### 3. 시뮬레이션
실제 과거 시장 상황에서 매매 판단을 받아 행동 점수 계산:

- **코로나 폭락 2주차** (2020-03-13): 팬데믹 선언, 서킷브레이커 발동
- **2008 금융위기 바닥** (2009-03-06): 공포 극대화, 실업률 급등
- **코로나 V자 회복** (2020-03-27): 무제한 양적완화 발표
- **2022 인플레 긴축** (2022-01-14): Fed 매파 전환
- **2023 AI 랠리** (2023-05-26): ChatGPT 열풍, 엔비디아 폭등
- **닷컴버블 정점** (2000-03-10): FOMO 극대화
- **2015 횡보장** (2015-08-21): 중국 경제 불안
- **2010 플래시 크래시** (2010-05-07): 알고리즘 매매 폭주

### 4. 행동 보정
- 퀴즈 점수 vs 실제 행동 점수 비교
- Gap Type 분석: `aligned`, `moderate_high`, `high_risk`, `moderate_low`, `low_risk`
- 보정된 위험 점수로 최종 전략 제시

### 5. 백테스팅 (향후 구현)
- 10년 과거 데이터 기반 백테스트
- 주요 지표: 총 수익률, 연환산 수익률, 샤프 비율, MDD, 승률, 변동성
- S&P 500 벤치마크 비교

### 6. 스트레스 테스트 (향후 구현)
- 주요 위기 기간 성과 분석
- 회복 기간 계산
- 초과 수익률 비교

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, asyncpg |
| Database | PostgreSQL 15 |
| AI | Google Gemini API |
| 데이터 | yfinance (10년 ETF 가격 데이터) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 컨테이너 | Docker Compose (DB) |

## 빠른 시작

### 1. 사전 요구사항
- Python 3.11+
- Docker & Docker Compose
- Node.js 18+ (프론트엔드)

### 2. 데이터베이스 시작
```bash
# 구 프로젝트 PostgreSQL이 이미 실행 중이면 생략
docker compose --profile db up -d
```

구 프로젝트의 PostgreSQL이 이미 실행 중이면 컨테이너를 띄우지 말고 아래 명령으로 스키마만 추가하세요.

```bash
psql -h localhost -p 5432 -U alphaflow -d alphaflow_us -f scripts/init_db.sql
```

### 3. 환경 설정
```bash
cp .env.development .env
# .env 파일에서 GEMINI_API_KEY 설정
```

### 4. 백엔드 실행
```bash
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
```

### 5. 과거 데이터 로딩
```bash
python scripts/load_history.py
```

### 6. API 테스트
```bash
# 헬스체크
curl http://localhost:8001/health

# 퀴즈 시작
curl -X POST http://localhost:8001/api/quiz/start
```

## API 엔드포인트

### 퀴즈
- `POST /api/quiz/start` - 퀴즈 시작 (기본 질문 반환)
- `POST /api/quiz/answer` - 기본 질문 답변 제출
- `POST /api/quiz/terms` - 용어 체크 제출
- `POST /api/quiz/advanced` - 고급 질문 답변 제출
- `GET /api/quiz/{session_id}` - 퀴즈 세션 조회

### 시뮬레이션
- `POST /api/simulation/start` - 시뮬레이션 시작 (랜덤 시나리오)
- `POST /api/simulation/answer` - 시나리오 답변 제출
- `POST /api/simulation/complete` - 시뮬레이션 완료 (행동 보정)
- `GET /api/simulation/{session_id}` - 시뮬레이션 세션 조회

### 공통
- `GET /health` - 헬스체크
- `GET /` - 서비스 정보

## 디렉터리 구조

```
alphaflow-us/
├── api/
│   ├── core/
│   │   ├── config.py         # 설정 관리 (pydantic-settings)
│   │   └── database.py       # asyncpg pool 관리
│   ├── models/
│   │   └── schemas.py        # Pydantic 스키마
│   ├── routers/
│   │   ├── quiz.py           # 퀴즈 API
│   │   └── simulation.py     # 시뮬레이션 API
│   ├── services/
│   │   ├── quiz_engine.py    # 퀴즈 로직
│   │   ├── strategy_mapper.py # 전략 매핑
│   │   ├── simulation_engine.py # 시나리오 정의
│   │   └── calibrator.py     # 행동 보정
│   └── main.py               # FastAPI 앱
├── scripts/
│   ├── init_db.sql           # DB 스키마
│   └── load_history.py       # 과거 데이터 로딩
├── frontend/                  # React 앱 (별도 생성)
├── docker-compose.yml         # PostgreSQL 컨테이너
├── requirements.txt
├── .env.development
├── .env.production
└── README.md
```

## 데이터베이스 스키마

### quiz_sessions
퀴즈 세션 및 결과 저장

### simulation_sessions
시뮬레이션 세션 및 행동 데이터

### backtest_results
백테스팅 결과 (향후 구현)

### stress_test_results
스트레스 테스트 결과 (향후 구현)

### price_history
ETF 과거 가격 데이터 (10년)

### ai_cache
AI API 응답 캐시

## 코딩 규칙

1. **비동기 I/O**: 모든 DB/네트워크 작업은 `async def`
2. **타입 힌트**: 모든 함수에 타입 힌트 필수
3. **독스트링**: 한국어로 작성, 식별자는 영어
4. **에러 처리**: `try-except` + `logging.error`
5. **설정 관리**: 하드코딩 금지, `config.py`에서 관리
6. **DB 접근**: `asyncpg`만 사용 (SQLAlchemy 없음)

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| ENV | 환경 (development/production) | development |
| GEMINI_API_KEY | Gemini API 키 | (필수) |
| DATABASE_URL | PostgreSQL URL | postgresql://alphaflow:alphaflow123@localhost:5432/alphaflow_us |
| APP_HOST | API 서버 호스트 | 0.0.0.0 |
| APP_PORT | API 서버 포트 | 8001 |
| CORS_ORIGINS | CORS 허용 오리진 | http://localhost:5174,http://localhost:3001 |
| LOG_LEVEL | 로그 레벨 | INFO |

## 향후 계획

- [ ] 백테스팅 엔진 구현
- [ ] 스트레스 테스트 구현
- [ ] AI 해설 (Gemini API)
- [ ] AI 스토리 생성
- [ ] 프론트엔드 개발 (React + TypeScript)
- [ ] 차트 시각화
- [ ] 소셜 공유 기능

## 라이선스

MIT

## 기여

이슈와 PR을 환영합니다!

## 문의

문제가 발생하면 GitHub Issues에 등록해주세요.

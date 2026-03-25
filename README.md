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

| 시나리오 키 | 이름 | 결정일 | 종목 |
|------------|------|--------|------|
| `covid_crash_week2` | 코로나 폭락 2주차 | 2020-03-13 | SPY |
| `gfc_2008_bottom` | 2008 금융위기 바닥 | 2009-03-06 | SPY |
| `covid_recovery` | 코로나 V자 회복 | 2020-03-27 | QQQ |
| `inflation_2022` | 2022 인플레 긴축 | 2022-01-14 | QQQ |
| `ai_rally_2023` | 2023 AI 랠리 | 2023-05-26 | QQQ |
| `dot_com_peak` | 닷컴버블 정점 | 2000-03-10 | SPY |
| `sideways_2015` | 2015 횡보장 | 2015-08-21 | SPY |
| `flash_crash_2010` | 2010 플래시 크래시 | 2010-05-07 | SPY |

### 4. 행동 보정 (Calibration)
- 퀴즈 점수 vs 실제 행동 점수 비교
- Gap Type 분류:
  - `aligned`: 퀴즈와 행동 일치 (±10p 이내)
  - `moderate_high`: 행동이 소폭 공격적 (+10~+25p)
  - `high_risk`: 행동이 대폭 공격적 (+25p 초과)
  - `moderate_low`: 행동이 소폭 보수적 (-10~-25p)
  - `low_risk`: 행동이 대폭 보수적 (-25p 미만)
- 보정 공식: `calibrated = quiz * 0.4 + action * 0.6`

### 5. 백테스팅
- 1y / 2y / 3y / 5y / 10y 기간별 백테스트
- 주요 지표: 총 수익률, CAGR, 샤프 비율, MDD, 소르티노 비율, 칼마 비율, 월간 승률
- S&P 500 벤치마크 비교
- 리밸런싱 (weekly/monthly/quarterly/semi_annually/yearly)
- MDD 초과 시 현금 100% 전환 → 1개월 후 재진입

### 6. 스트레스 테스트
- 8개 주요 위기/랠리 구간 성과 분석
- 전문성 수준(beginner/intermediate/advanced)에 따른 구간 선택
- 회복 기간 계산, 초과 수익률 비교

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, asyncpg |
| Database | PostgreSQL 15 |
| AI | Google Gemini API (예정) |
| 데이터 | yfinance (10년 ETF 가격 데이터) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| 컨테이너 | Docker Compose (DB) |

## 빠른 시작

### 1. 사전 요구사항
- Python 3.11+
- Docker & Docker Compose
- Node.js 18+

### 2. 데이터베이스 시작
```bash
# 새로 시작하는 경우
docker compose --profile db up -d

# 이미 실행 중인 경우 스키마만 추가
psql -h localhost -p 5432 -U alphaflow -d alphaflow_us -f scripts/init_db.sql
```

### 3. 환경 설정
```bash
cp .env.development .env
# .env 파일에서 GEMINI_API_KEY 설정 (선택)
```

### 4. 백엔드 실행
```bash
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
```

### 5. 과거 데이터 로딩 (최초 1회)
```bash
python scripts/load_history.py
```

### 6. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173 에서 접속
```

### 7. API 테스트
```bash
# 헬스체크
curl http://localhost:8001/health

# 퀴즈 시작
curl -X POST http://localhost:8001/api/quiz/start

# Swagger UI
open http://localhost:8001/docs
```

## API 엔드포인트

### 퀴즈
| 메서드 | 경로 | 설명 | Request Body |
|--------|------|------|--------------|
| `POST` | `/api/quiz/start` | 퀴즈 시작 (세션 생성 + Q1~Q5) | 없음 |
| `POST` | `/api/quiz/answer` | 기본 답변 제출 (Q1~Q5) | `{session_id, answers: {Q1:int, ...}}` |
| `POST` | `/api/quiz/terms` | 용어 체크 제출 (T1~T5) | `{session_id, term_answers: {T1:bool, ...}}` |
| `POST` | `/api/quiz/advanced` | 고급 답변 제출 (Q6~Q10) | `{session_id, advanced_answers: {Q6:str, Q7:int, ...}}` |
| `GET`  | `/api/quiz/{session_id}` | 퀴즈 세션 조회 | - |

### 시뮬레이션
| 메서드 | 경로 | 설명 | Request Body |
|--------|------|------|--------------|
| `POST` | `/api/simulation/start` | 시뮬레이션 시작 | `{quiz_session_id, scenario_count?}` |
| `POST` | `/api/simulation/answer` | 시나리오 답변 제출 | `{session_id, scenario_key, action: "buy"\|"hold"\|"sell"}` |
| `POST` | `/api/simulation/complete` | 시뮬레이션 완료 + 행동 보정 | `{session_id}` |
| `GET`  | `/api/simulation/{session_id}` | 시뮬레이션 세션 조회 | - |
| `GET`  | `/api/simulation/{session_id}/chart/{scenario_key}` | 차트 데이터 조회 | - |

### 백테스트
| 메서드 | 경로 | 설명 | Request Body |
|--------|------|------|--------------|
| `POST` | `/api/backtest/run` | 백테스트 실행 (전 기간) | `{quiz_session_id}` |
| `POST` | `/api/backtest/stress-test` | 스트레스 테스트 실행 | `{quiz_session_id}` |
| `GET`  | `/api/backtest/results/{quiz_session_id}` | 백테스트 결과 목록 | - |
| `GET`  | `/api/backtest/results/{quiz_session_id}/{period}` | 특정 기간 결과 | - |
| `GET`  | `/api/backtest/stress/{quiz_session_id}` | 스트레스 테스트 결과 | - |

### 공통
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/health` | 헬스체크 |
| `GET` | `/` | 서비스 정보 |
| `GET` | `/docs` | Swagger UI |

## 디렉터리 구조

```
alphaflow-us/
├── api/
│   ├── core/
│   │   ├── config.py               # 설정 관리 (pydantic-settings)
│   │   └── database.py             # asyncpg pool 관리
│   ├── models/
│   │   └── schemas.py              # Pydantic 스키마
│   ├── routers/
│   │   ├── quiz.py                 # 퀴즈 API
│   │   ├── simulation.py           # 시뮬레이션 API
│   │   └── backtest.py             # 백테스트/스트레스 테스트 API
│   ├── services/
│   │   ├── quiz_engine.py          # 퀴즈 로직 및 질문 정의
│   │   ├── strategy_mapper.py      # 전략 매핑 (5가지 프로필)
│   │   ├── simulation_engine.py    # 시나리오 정의 및 차트 데이터
│   │   ├── calibrator.py           # 행동 보정 (Gap 분석)
│   │   ├── backtester.py           # 백테스트 엔진
│   │   ├── stress_tester.py        # 스트레스 테스트
│   │   └── data_loader.py          # 가격 데이터 로더 (yfinance + DB)
│   └── main.py                     # FastAPI 앱 진입점
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts           # Axios API 클라이언트
│   │   ├── components/common/      # 공통 컴포넌트
│   │   ├── hooks/
│   │   │   ├── useQuiz.ts          # 퀴즈 훅
│   │   │   ├── useSimulation.ts    # 시뮬레이션 훅
│   │   │   ├── useBacktest.ts      # 백테스트 훅
│   │   │   └── useAI.ts            # AI 훅 (미구현)
│   │   ├── pages/                  # 페이지 컴포넌트
│   │   └── types/index.ts          # TypeScript 타입 정의
│   ├── vite.config.ts              # Vite 설정 (proxy: 8001)
│   └── package.json
├── scripts/
│   ├── init_db.sql                 # DB 스키마 초기화
│   └── load_history.py             # 과거 가격 데이터 로딩
├── docker-compose.yml              # PostgreSQL 컨테이너
├── requirements.txt
├── .env.development
├── .env.production
└── README.md
```

## 데이터베이스 스키마

### quiz_sessions
퀴즈 세션 및 결과 저장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 세션 ID |
| quiz_answers | JSONB | Q1~Q5 답변 |
| term_answers | JSONB | T1~T5 답변 |
| advanced_answers | JSONB | Q6~Q10 답변 |
| risk_score | INTEGER | 위험 점수 (0~100) |
| expertise_level | VARCHAR | beginner/intermediate/advanced |
| strategy_key | VARCHAR | 전략 키 |
| detail_level | VARCHAR | 상세 수준 |

### simulation_sessions
시뮬레이션 세션 및 행동 데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 세션 ID |
| quiz_session_id | UUID | 연결된 퀴즈 세션 |
| scenarios | JSONB | 선택된 시나리오 키 목록 |
| actions | JSONB | 시나리오별 행동 및 점수 |
| action_risk_score | INTEGER | 행동 기반 위험 점수 |
| calibrated_risk_score | INTEGER | 보정된 위험 점수 |
| gap_type | VARCHAR | 갭 유형 |

### price_history
ETF 과거 가격 데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| symbol | VARCHAR | 티커 심볼 |
| date | DATE | 날짜 |
| open/high/low/close | NUMERIC | OHLC |
| volume | BIGINT | 거래량 |
| adj_close | NUMERIC | 수정 종가 |

> ⚠️ **주의**: 컬럼명은 `symbol`입니다 (`ticker` 아님).

## 코딩 규칙

1. **비동기 I/O**: 모든 DB/네트워크 작업은 `async def`
2. **타입 힌트**: 모든 함수에 타입 힌트 필수
3. **독스트링**: 한국어로 작성, 식별자는 영어
4. **에러 처리**: `try-except` + `logging.error`
5. **설정 관리**: 하드코딩 금지, `config.py`에서 관리
6. **DB 접근**: `asyncpg`만 사용 (SQLAlchemy 없음)
7. **API 요청**: `session_id`, `quiz_session_id` 필드는 snake_case 사용

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| ENV | 환경 (development/production) | development |
| GEMINI_API_KEY | Gemini API 키 | (선택) |
| DATABASE_URL | PostgreSQL URL | postgresql://alphaflow:alphaflow123@localhost:5432/alphaflow_us |
| APP_HOST | API 서버 호스트 | 0.0.0.0 |
| APP_PORT | API 서버 포트 | **8001** |
| CORS_ORIGINS | CORS 허용 오리진 | http://localhost:5173,http://localhost:5174 |
| LOG_LEVEL | 로그 레벨 | INFO |

## 알려진 이슈 / 향후 계획

- [ ] AI 해설 엔드포인트 (`/api/ai/commentary`, `/api/ai/story`, `/api/ai/image`) 구현
- [ ] Gemini API 연동 및 시나리오별 AI 코멘트 생성
- [ ] 소셜 공유 이미지 생성
- [ ] 프론트엔드 차트 개선 (캔들스틱 차트)
- [ ] 사용자 인증 및 결과 저장
- [ ] 모바일 반응형 최적화

## 라이선스

MIT

## 문의

이슈가 발생하면 GitHub Issues에 등록해주세요.

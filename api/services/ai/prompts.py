"""
AI 프롬프트 템플릿 모음
모든 프롬프트는 한국어 응답과 JSON 스키마 명시를 포함
"""
import json
from typing import Any, Dict, List


def _tone_guidance(expertise_level: str) -> str:
    level = (expertise_level or "intermediate").lower()
    if level == "beginner":
        return "톤: 쉬운 한국어, 친근한 말투, 비유 활용, 숫자는 1~2개만 사용, 문장은 짧게."
    if level == "advanced":
        return "톤: 데이터 기반, 지표와 수치 언급, 전문 용어 허용, 핵심 논리 위주, 장단점 균형 있게."
    return "톤: 명확한 요약 + 핵심 수치 2~3개, 지나친 전문 용어는 풀어서 설명, 행동 지침 포함."


def strategy_design_prompt(
    risk_score: int,
    expertise_level: str,
    quiz_answers: Dict[str, Any],
    simulation_actions: List[Dict[str, Any]],
    calibrated_score: int,
) -> str:
    return f"""
너는 한국 투자자를 위한 전략 설계 AI다. 모든 답변은 한국어로 작성한다.
입력:
- 위험 점수(퀴즈): {risk_score}
- 보정된 위험 점수: {calibrated_score}
- 전문성 수준: {expertise_level} ({_tone_guidance(expertise_level)})
- 퀴즈 답변 요약: {json.dumps(quiz_answers, ensure_ascii=False)}
- 시뮬레이션 행동: {json.dumps(simulation_actions, ensure_ascii=False)}

요구사항:
1) JSON 형식으로만 응답한다.
2) 스키마:
{{
  "strategy_name": "문자열",
  "description": "전략 설명",
  "asset_allocation": {{"stocks": 0.0~1.0, "bonds": 0.0~1.0, "cash": 0.0~1.0}},
  "equity_detail": {{
    "sector_weights": {{"SPY": 0.4, "QQQ": 0.3 ...}},
    "leverage_allowed": true/false,
    "macro_weight": 0.0~1.0
  }},
  "rebalance_frequency": "weekly|monthly|quarterly|semi_annually|yearly",
  "max_drawdown_tolerance": 0.0~1.0,
  "stop_loss_pct": 0~100,
  "take_profit_pct": 0~200,
  "leverage_allowed": true/false,
  "reasoning": "설계 근거"
}}
3) 위험 점수에 맞게 자산 비중과 손절/익절 기준을 설정한다.
4) 섹터 가중치는 합이 1이 되게 균형을 맞춘다.
5) 반드시 한국어로만 응답하고, JSON 외의 텍스트는 포함하지 않는다.
"""


def strategy_validation_prompt(
    strategy: Dict[str, Any],
    backtest_results: Dict[str, Any],
    iteration: int,
) -> str:
    stage = {1: "1차 검증", 2: "2차 미세조정", 3: "최종 확인"}.get(iteration, f"{iteration}차 검증")
    return f"""
너는 투자 전략을 검증하고 미세 조정하는 한국어 AI다. 현재 단계: {stage}
백테스트 요약: {json.dumps(backtest_results, ensure_ascii=False)}
현재 전략: {json.dumps(strategy, ensure_ascii=False)}

요구사항:
1) JSON 형식으로만 답변한다.
2) 스키마:
{{
  "adjustments": ["수정 포인트 1", "수정 포인트 2", ...],
  "adjusted_strategy": {{
    "strategy_name": "...",
    "description": "...",
    "asset_allocation": {{"stocks": 0.x, "bonds": 0.x, "cash": 0.x}},
    "equity_detail": {{
      "sector_weights": {{...}},
      "leverage_allowed": true/false,
      "macro_weight": 0~1
    }},
    "rebalance_frequency": "weekly|monthly|quarterly|semi_annually|yearly",
    "max_drawdown_tolerance": 0~1,
    "stop_loss_pct": 0~100,
    "take_profit_pct": 0~200,
    "leverage_allowed": true/false,
    "reasoning": "수정 근거"
  }},
  "reasoning": "이번 단계 조정 이유"
}}
3) 수익/리스크 지표(CAGR, MDD, 샤프, 월간 승률)를 개선하도록 수정한다.
4) 전략 이름과 설명도 함께 업데이트한다.
"""


def commentary_prompt(
    backtest_results: List[Dict[str, Any]],
    strategy: Dict[str, Any],
    expertise_level: str,
) -> str:
    return f"""
너는 친근하고 유머러스한 금융 해설가다. 모든 답변은 한국어.
전략 정보: {json.dumps(strategy, ensure_ascii=False)}
백테스트 결과 목록: {json.dumps(backtest_results, ensure_ascii=False)}
전문성 수준: {expertise_level} ({_tone_guidance(expertise_level)})

JSON 스키마:
{{
  "headline": "한 줄 헤드라인",
  "summary": "핵심 요약 2~3문장",
  "period_analysis": [{{"period": "1y", "comment": "..."}}], 
  "risk_warning": "주의할 리스크",
  "fun_fact": "짧은 흥미 포인트"
}}
규칙:
- 반드시 위 JSON 형태로만 응답.
- 숫자는 백테스트 결과의 지표를 활용.
- 초보자는 쉬운 단어, 고급 사용자는 지표 중심.
"""


def storytelling_prompt(
    period_key: str,
    period_name: str,
    user_return: float,
    sp500_return: float,
    expertise_level: str,
) -> str:
    return f"""
너는 시장 스토리텔러다. 모든 답변은 한국어 JSON.
시나리오: {period_key} ({period_name})
사용자 수익률: {user_return}%
S&P500 수익률: {sp500_return}%
전문성 수준: {expertise_level} ({_tone_guidance(expertise_level)})

JSON 스키마:
{{
  "title": "스토리 제목",
  "story": "짧은 서사 (3~4문장)",
  "lesson": "교훈/시사점",
  "emoji": "이모지 한 개"
}}
규칙: 긍정/부정 결과와 교훈을 명확히 연결하고, 숫자는 퍼센트로 표기.
"""


def scenario_selection_prompt(
    risk_score: int,
    expertise_level: str,
    available_scenarios: List[Dict[str, Any]],
) -> str:
    return f"""
사용자의 위험 점수: {risk_score}, 전문성: {expertise_level} ({_tone_guidance(expertise_level)})
가능한 시나리오: {json.dumps(available_scenarios, ensure_ascii=False)}

JSON 스키마:
{{
  "selected_keys": ["scenario_key1", "scenario_key2", ...],
  "reasoning": "선택 근거 요약"
}}
규칙: 위험 점수가 높으면 변동성 높은 시나리오를 더 많이 포함하되 3~5개만 선택한다. 반드시 한국어.
"""


def news_curation_prompt(
    scenario: Dict[str, Any],
    expertise_level: str,
) -> str:
    return f"""
시장 시나리오 정보: {json.dumps(scenario, ensure_ascii=False)}
전문성 수준: {expertise_level} ({_tone_guidance(expertise_level)})

JSON 스키마:
{{
  "curated_news": [
    {{"headline": "제목", "explanation": "짧은 해설", "sentiment": "positive|neutral|negative"}}
  ]
}}
규칙:
- 반드시 한국어 JSON으로만 응답.
- 각 뉴스는 2문장 이하, 투자 관점의 함의를 포함.
- sentiment는 명확히 한 단어로 표기.
"""


def image_prompt(strategy_name: str, risk_level: str) -> str:
    return f"""
다음 전략에 어울리는 캐릭터 일러스트를 묘사하는 프롬프트를 생성하라.
전략명: {strategy_name}
위험 등급: {risk_level}

캐릭터 가이드:
- 안전제일: 차분한 거북이, 푸른 톤, 안정감.
- 신중형: 지혜로운 부엉이, 밤하늘 배경, 침착함.
- 균형형: 영리한 여우, 따뜻한 오렌지, 균형 잡힌 포즈.
- 공격형: 포효하는 사자, 역동적 포즈, 강렬한 붉은 톤.
- 초공격형: 우주복을 입은 고양이 우주비행사, 별과 로켓, 장난기.

응답은 한국어로 된 짧은 장면 설명 한 문단만 제공한다. JSON이 아니라 순수 텍스트 프롬프트를 반환한다.
"""

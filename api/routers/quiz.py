"""
퀴즈 라우터: 투자 성향 퀴즈 API 엔드포인트

퀴즈 시작, 답변 제출, 용어 체크, 고급 질문, 결과 조회 엔드포인트를 제공한다.
"""
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.core.database import execute, fetch_one
from api.services.quiz_engine import (
    calculate_risk_score,
    determine_expertise,
    get_advanced_questions,
    get_basic_questions,
    get_term_questions,
    should_show_advanced,
)
from api.services.strategy_mapper import (
    customize_strategy,
    get_strategy_character,
    map_strategy,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/quiz", tags=["quiz"])


# ============================================================
# Pydantic 모델
# ============================================================


class QuizStartResponse(BaseModel):
    """퀴즈 시작 응답"""
    session_id: str
    questions: List[Dict[str, Any]]
    message: str = "기본 질문에 답변해 주세요."


class QuizAnswerRequest(BaseModel):
    """기본 질문 답변 요청"""
    session_id: str
    answers: Dict[str, int] = Field(..., description="Q1~Q5 답변, 예: {'Q1': 3, 'Q2': 2, ...}")


class QuizAnswerResponse(BaseModel):
    """기본 질문 답변 응답"""
    session_id: str
    risk_score: int
    next_step: str = "term_check"
    term_questions: List[Dict[str, Any]]
    message: str = "다음으로 투자 용어를 확인해주세요."


class QuizTermCheckRequest(BaseModel):
    """용어 체크 요청"""
    session_id: str
    term_answers: Dict[str, bool] = Field(..., description="T1~T5 답변, 예: {'T1': True, 'T2': False, ...}")


class QuizTermCheckResponse(BaseModel):
    """용어 체크 응답"""
    session_id: str
    expertise_level: str
    show_advanced: bool
    advanced_questions: Optional[List[Dict[str, Any]]] = None
    message: str


class QuizAdvancedRequest(BaseModel):
    """고급 질문 답변 요청 (선택)"""
    session_id: str
    advanced_answers: Dict[str, Any] = Field(
        ...,
        description="Q6~Q10 답변, 예: {'Q6': 'tech', 'Q7': 3, 'Q8': 4, 'Q9': 2, 'Q10': 3}"
    )


class QuizResultResponse(BaseModel):
    """최종 퀴즈 결과 응답"""
    session_id: str
    risk_score: int
    expertise_level: str
    strategy_key: str
    strategy_profile: Dict[str, Any]
    character: Dict[str, str]
    message: str = "투자 성향 분석이 완료되었습니다!"


class QuizSessionResponse(BaseModel):
    """세션 전체 정보 조회 응답"""
    session_id: str
    user_id: Optional[str]
    status: str
    basic_answers: Optional[Dict[str, int]]
    term_answers: Optional[Dict[str, bool]]
    advanced_answers: Optional[Dict[str, Any]]
    risk_score: Optional[int]
    expertise_level: Optional[str]
    strategy_key: Optional[str]
    strategy_profile: Optional[Dict[str, Any]]
    created_at: str
    updated_at: str


# ============================================================
# 엔드포인트
# ============================================================


@router.post("/start", response_model=QuizStartResponse)
async def start_quiz(user_id: Optional[str] = None) -> QuizStartResponse:
    """
    퀴즈를 시작하고 기본 질문(Q1~Q5)을 반환한다.
    """
    session_id = str(uuid.uuid4())

    # DB에 세션 생성
    await execute(
        """
        INSERT INTO quiz_sessions (session_id, user_id, status)
        VALUES ($1, $2, 'started')
        """,
        session_id,
        user_id,
    )

    logger.info(f"Quiz session started: {session_id}")

    return QuizStartResponse(
        session_id=session_id,
        questions=get_basic_questions(),
    )


@router.post("/answer", response_model=QuizAnswerResponse)
async def submit_basic_answers(request: QuizAnswerRequest) -> QuizAnswerResponse:
    """
    기본 질문(Q1~Q5) 답변을 제출하고 risk_score를 계산한다.
    다음 단계로 용어 체크 질문을 반환한다.
    """
    # 세션 확인
    session = await fetch_one(
        "SELECT id, status FROM quiz_sessions WHERE session_id = $1",
        request.session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    # risk_score 계산
    risk_score = calculate_risk_score(request.answers)

    # DB 업데이트
    await execute(
        """
        UPDATE quiz_sessions
        SET basic_answers = $1, risk_score = $2, updated_at = NOW()
        WHERE session_id = $3
        """,
        json.dumps(request.answers),
        risk_score,
        request.session_id,
    )

    logger.info(f"Basic answers submitted for session {request.session_id}, risk_score={risk_score}")

    return QuizAnswerResponse(
        session_id=request.session_id,
        risk_score=risk_score,
        term_questions=get_term_questions(),
    )


@router.post("/terms", response_model=QuizTermCheckResponse)
async def submit_term_answers(request: QuizTermCheckRequest) -> QuizTermCheckResponse:
    """
    용어 체크(T1~T5) 답변을 제출하고 expertise_level을 결정한다.
    고급 질문 표시 여부를 반환한다.
    """
    # 세션 확인
    session = await fetch_one(
        "SELECT id, status FROM quiz_sessions WHERE session_id = $1",
        request.session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    # expertise_level 결정
    expertise_level = determine_expertise(request.term_answers)
    show_advanced = should_show_advanced(request.term_answers)

    # DB 업데이트
    await execute(
        """
        UPDATE quiz_sessions
        SET term_answers = $1, expertise_level = $2, updated_at = NOW()
        WHERE session_id = $3
        """,
        json.dumps(request.term_answers),
        expertise_level,
        request.session_id,
    )

    logger.info(
        f"Term answers submitted for session {request.session_id}, "
        f"expertise={expertise_level}, show_advanced={show_advanced}"
    )

    if show_advanced:
        return QuizTermCheckResponse(
            session_id=request.session_id,
            expertise_level=expertise_level,
            show_advanced=True,
            advanced_questions=get_advanced_questions(),
            message="고급 질문에 답변하시면 더 정교한 전략을 추천해 드립니다.",
        )
    else:
        # 고급 질문 없이 바로 전략 매핑
        return await _finalize_strategy(request.session_id, expertise_level, None)


@router.post("/advanced", response_model=QuizResultResponse)
async def submit_advanced_answers(request: QuizAdvancedRequest) -> QuizResultResponse:
    """
    고급 질문(Q6~Q10) 답변을 제출하고 최종 전략을 매핑한다.
    """
    # 세션 조회
    session = await fetch_one(
        """
        SELECT risk_score, expertise_level
        FROM quiz_sessions
        WHERE session_id = $1
        """,
        request.session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    if session["risk_score"] is None:
        raise HTTPException(status_code=400, detail="Basic answers not submitted yet")

    expertise_level = session["expertise_level"] or "intermediate"

    # 고급 답변 저장
    await execute(
        """
        UPDATE quiz_sessions
        SET advanced_answers = $1, updated_at = NOW()
        WHERE session_id = $2
        """,
        json.dumps(request.advanced_answers),
        request.session_id,
    )

    # 전략 매핑
    return await _finalize_strategy(request.session_id, expertise_level, request.advanced_answers)


@router.get("/{session_id}", response_model=QuizSessionResponse)
async def get_quiz_session(session_id: str) -> QuizSessionResponse:
    """
    세션 전체 정보를 조회한다.
    """
    session = await fetch_one(
        """
        SELECT session_id, user_id, status,
               basic_answers, term_answers, advanced_answers,
               risk_score, expertise_level, strategy_key, strategy_profile,
               created_at, updated_at
        FROM quiz_sessions
        WHERE session_id = $1
        """,
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    return QuizSessionResponse(
        session_id=session["session_id"],
        user_id=session["user_id"],
        status=session["status"],
        basic_answers=session["basic_answers"],
        term_answers=session["term_answers"],
        advanced_answers=session["advanced_answers"],
        risk_score=session["risk_score"],
        expertise_level=session["expertise_level"],
        strategy_key=session["strategy_key"],
        strategy_profile=session["strategy_profile"],
        created_at=session["created_at"].isoformat() if session["created_at"] else "",
        updated_at=session["updated_at"].isoformat() if session["updated_at"] else "",
    )


# ============================================================
# 헬퍼 함수
# ============================================================


async def _finalize_strategy(
    session_id: str,
    expertise_level: str,
    advanced_answers: Optional[Dict[str, Any]],
) -> QuizResultResponse:
    """
    전략을 매핑하고 DB에 저장한 후 최종 결과를 반환한다.

    Args:
        session_id: 세션 ID
        expertise_level: 전문성 수준
        advanced_answers: 고급 질문 답변 (선택)

    Returns:
        QuizResultResponse
    """
    # 세션 조회
    session = await fetch_one(
        "SELECT risk_score FROM quiz_sessions WHERE session_id = $1",
        session_id,
    )
    if not session or session["risk_score"] is None:
        raise HTTPException(status_code=400, detail="Risk score not calculated")

    risk_score = session["risk_score"]

    # 전략 매핑
    base_strategy = map_strategy(risk_score)
    final_strategy = customize_strategy(base_strategy, advanced_answers)
    strategy_key = final_strategy["strategy_key"]
    character = get_strategy_character(strategy_key)

    # DB 업데이트
    await execute(
        """
        UPDATE quiz_sessions
        SET strategy_key = $1,
            strategy_profile = $2,
            status = 'completed',
            updated_at = NOW()
        WHERE session_id = $3
        """,
        strategy_key,
        json.dumps(final_strategy),
        session_id,
    )

    logger.info(f"Strategy finalized for session {session_id}: {strategy_key}")

    return QuizResultResponse(
        session_id=session_id,
        risk_score=risk_score,
        expertise_level=expertise_level,
        strategy_key=strategy_key,
        strategy_profile=final_strategy,
        character=character,
    )

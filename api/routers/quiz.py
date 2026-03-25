"""
AlphaFlow US v2 - 퀴즈 라우터
투자 성향 퀴즈 API 엔드포인트
"""
import json
import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status

from api.core.database import get_pool
from api.models.schemas import (
    QuizStartResponse,
    QuizQuestion,
    QuizAnswerRequest,
    QuizTermCheckRequest,
    QuizAdvancedRequest,
    QuizResultResponse,
)
from api.services import quiz_engine, strategy_mapper

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/start", response_model=QuizStartResponse)
async def start_quiz():
    """퀴즈 시작 - 세션 생성 + Q1~Q5 반환"""
    try:
        pool = get_pool()
        session_id = uuid4()

        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO quiz_sessions (id, created_at) VALUES ($1, NOW())",
                session_id,
            )

        questions_raw = quiz_engine.get_basic_questions()
        questions = [
            QuizQuestion(
                id=q["id"],
                text=q["text"],
                options=[
                    {"value": str(o["value"]), "label": o["label"]}
                    for o in q["options"]
                ],
            )
            for q in questions_raw
        ]

        logger.info(f"퀴즈 세션 생성: {session_id}")
        return QuizStartResponse(session_id=session_id, questions=questions)

    except Exception as e:
        logger.error(f"퀴즈 시작 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"퀴즈 시작 중 오류: {str(e)}",
        )


@router.post("/answer")
async def submit_answers(request: QuizAnswerRequest):
    """기본 퀴즈 답변 제출 (Q1~Q5) → risk_score 계산"""
    try:
        pool = get_pool()

        risk_score = quiz_engine.calculate_risk_score(request.answers)

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                "SELECT id FROM quiz_sessions WHERE id = $1",
                request.session_id,
            )
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="퀴즈 세션을 찾을 수 없습니다.",
                )

            await conn.execute(
                """
                UPDATE quiz_sessions
                SET risk_score = $1, quiz_answers = $2
                WHERE id = $3
                """,
                risk_score,
                json.dumps(request.answers),
                request.session_id,
            )

        logger.info(f"답변 저장: session={request.session_id}, risk_score={risk_score}")
        return {
            "session_id": str(request.session_id),
            "risk_score": risk_score,
            "message": "답변이 저장되었습니다.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"답변 제출 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"답변 저장 중 오류: {str(e)}",
        )


@router.post("/terms")
async def submit_term_check(request: QuizTermCheckRequest):
    """용어 체크 제출 (T1~T5) → expertise_level + should_show_advanced"""
    try:
        pool = get_pool()

        expertise_level = quiz_engine.determine_expertise(request.term_answers)
        show_advanced = quiz_engine.should_show_advanced(request.term_answers)

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                "SELECT id FROM quiz_sessions WHERE id = $1",
                request.session_id,
            )
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="퀴즈 세션을 찾을 수 없습니다.",
                )

            await conn.execute(
                """
                UPDATE quiz_sessions
                SET expertise_level = $1, term_answers = $2
                WHERE id = $3
                """,
                expertise_level,
                json.dumps(request.term_answers),
                request.session_id,
            )

        logger.info(
            f"용어 체크 저장: session={request.session_id}, "
            f"expertise={expertise_level}, show_advanced={show_advanced}"
        )

        advanced_questions = quiz_engine.get_advanced_questions() if show_advanced else []

        return {
            "session_id": str(request.session_id),
            "expertise_level": expertise_level,
            "should_show_advanced": show_advanced,
            "advanced_questions": advanced_questions,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"용어 체크 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"용어 체크 저장 중 오류: {str(e)}",
        )


@router.post("/advanced", response_model=QuizResultResponse)
async def submit_advanced(request: QuizAdvancedRequest):
    """고급 질문 제출 (Q6~Q10) → 전략 매핑 + 최종 결과"""
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                "SELECT id, risk_score, expertise_level FROM quiz_sessions WHERE id = $1",
                request.session_id,
            )
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="퀴즈 세션을 찾을 수 없습니다.",
                )

            risk_score = session["risk_score"] or 50
            expertise_level = session["expertise_level"] or "intermediate"

            # 전략 매핑
            base_strategy = strategy_mapper.map_strategy(risk_score)
            final_strategy = strategy_mapper.customize_strategy(
                base_strategy, request.advanced_answers
            )

            strategy_key = final_strategy["strategy_key"]
            detail_level = expertise_level  # beginner / intermediate / advanced

            await conn.execute(
                """
                UPDATE quiz_sessions
                SET strategy_key = $1,
                    advanced_answers = $2,
                    detail_level = $3
                WHERE id = $4
                """,
                strategy_key,
                json.dumps(request.advanced_answers),
                detail_level,
                request.session_id,
            )

        logger.info(
            f"고급 응답 저장: session={request.session_id}, "
            f"strategy={strategy_key}, detail={detail_level}"
        )

        return QuizResultResponse(
            session_id=request.session_id,
            risk_score=risk_score,
            expertise_level=expertise_level,
            strategy_key=strategy_key,
            detail_level=detail_level,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"고급 응답 저장 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"고급 응답 저장 중 오류: {str(e)}",
        )


@router.get("/{session_id}")
async def get_quiz_session(session_id: UUID):
    """퀴즈 세션 상세 조회"""
    try:
        pool = get_pool()

        async with pool.acquire() as conn:
            session = await conn.fetchrow(
                """
                SELECT id, risk_score, expertise_level, strategy_key,
                       detail_level, created_at
                FROM quiz_sessions
                WHERE id = $1
                """,
                session_id,
            )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="퀴즈 세션을 찾을 수 없습니다.",
                )

        strategy = None
        if session["strategy_key"]:
            strategy = strategy_mapper.map_strategy(session["risk_score"] or 50)
            character = strategy_mapper.get_strategy_character(session["strategy_key"])
            strategy["character"] = character

        return {
            "session_id": str(session["id"]),
            "risk_score": session["risk_score"],
            "expertise_level": session["expertise_level"],
            "strategy_key": session["strategy_key"],
            "detail_level": session["detail_level"],
            "strategy": strategy,
            "created_at": session["created_at"].isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 조회 중 오류: {str(e)}",
        )

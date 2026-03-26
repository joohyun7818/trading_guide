"""
AI 라우팅 허브
- 캐시 조회
- 환경별 모델 라우팅
- Gemini/Haiku 호출 및 429 fallback
"""
import logging
from typing import Any, Dict, Optional

from api.core.config import settings
from api.services.ai import cache
from api.services.ai.gemini import GeminiClient, RateLimitError
from api.services.ai.haiku import HaikuClient

logger = logging.getLogger(__name__)

# 개발 환경 라우팅
DEV_ROUTES = {
    "strategy_design": "gemini-2.5-pro",
    "strategy_validation": "gemini-2.5-pro",
    "commentary": "gemini-2.5-flash",
    "storytelling": "gemini-2.5-flash",
    "scenario_selection": "gemini-2.5-flash-lite",
    "news_curation": "gemini-2.5-flash-lite",
    "calibration_message": "gemini-2.5-flash-lite",
    "image_generation": "gemini-2.0-flash-image",
}

# 프로덕션 라우팅
PROD_ROUTES = {
    "strategy_design": "gemini-3-flash",
    "strategy_validation": "gemini-3-flash",
    "commentary": "haiku",
    "storytelling": "haiku",
    "image_generation": "gemini-3.1-flash-image-preview",
}

DEFAULT_DEV_MODEL = "gemini-2.5-flash-lite"
DEFAULT_PROD_MODEL = "gemini-2.5-flash"

FALLBACKS = {
    "gemini-2.5-pro": ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    "gemini-2.5-flash": ["gemini-2.5-flash-lite"],
}

gemini_client = GeminiClient()
haiku_client = HaikuClient()


def _routes() -> Dict[str, str]:
    return PROD_ROUTES if settings.ENV == "production" else DEV_ROUTES


def _default_model() -> str:
    return DEFAULT_PROD_MODEL if settings.ENV == "production" else DEFAULT_DEV_MODEL


async def _call_gemini(
    task: str,
    prompt: str,
    model: str,
    temperature: float,
    max_tokens: int,
    response_format: Optional[str],
) -> Dict[str, Any]:
    models_to_try = [model] + FALLBACKS.get(model, [])
    last_error: Optional[Exception] = None

    for candidate in models_to_try:
        try:
            if task == "image_generation" or "image" in candidate:
                return await gemini_client.generate_image(prompt, model=candidate)
            return await gemini_client.generate(
                prompt=prompt,
                model=candidate,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
            )
        except RateLimitError as exc:
            last_error = exc
            logger.warning(f"Gemini {candidate} 한도 초과, 다음 모델로 fallback")
            continue
    if last_error:
        raise last_error
    raise RuntimeError("Gemini 호출 실패: 사용 가능한 모델이 없습니다.")


async def generate(
    task: str,
    prompt: str,
    *,
    temperature: float = 0.3,
    max_tokens: int = 1024,
    response_format: Optional[str] = "json",
    system: Optional[str] = None,
) -> Dict[str, Any]:
    """AI 호출 엔트리 포인트"""
    cached = await cache.get(task, prompt)
    if cached is not None:
        return cached

    routes = _routes()
    model = routes.get(task, _default_model())
    result: Dict[str, Any]

    if model == "haiku":
        try:
            result = await haiku_client.generate(
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                system=system,
            )
        except Exception as exc:
            logger.error(f"Haiku 실패, Gemini Flash로 대체: {exc}")
            result = await _call_gemini(
                task=task,
                prompt=prompt,
                model="gemini-2.5-flash",
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
            )
    else:
        result = await _call_gemini(
            task=task,
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )

    try:
        await cache.set(task, prompt, result)
    except Exception as exc:  # pragma: no cover - 캐시 실패는 치명적 아님
        logger.warning(f"AI 캐시 저장 실패: {exc}")

    return result

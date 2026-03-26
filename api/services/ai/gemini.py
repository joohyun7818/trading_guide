"""
Gemini API 클라이언트
google-genai SDK 기반 호출 + RPM 간격 제어 + 백오프 처리
"""
import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

from google import genai
from google.genai import types

from api.core.config import settings

logger = logging.getLogger(__name__)

# 모델별 호출 간격 (초)
RATE_LIMIT_INTERVALS = {
    "gemini-2.5-pro": 12.0,
    "gemini-2.5-flash": 6.0,
    "gemini-2.5-flash-lite": 4.0,
    "gemini-2.0-flash-image": 6.0,
}

MAX_RETRIES = 3
BACKOFF_BASE = 30  # 초


class RateLimitError(Exception):
    """429 한도 초과 오류"""


class GeminiClient:
    """Gemini 호출 클라이언트 (비동기 래퍼)"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.lock = asyncio.Lock()
        self.last_called: Dict[str, float] = {}

    def _interval_for_model(self, model: str) -> float:
        return RATE_LIMIT_INTERVALS.get(model, 4.0)

    async def _respect_rate_limit(self, model: str) -> None:
        interval = self._interval_for_model(model)
        now = time.monotonic()
        last = self.last_called.get(model, 0.0)
        wait = interval - (now - last)
        if wait > 0:
            await asyncio.sleep(wait)
        self.last_called[model] = time.monotonic()

    @staticmethod
    def _is_rate_limit_error(exc: Exception) -> bool:
        code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        message = str(exc).lower()
        return code == 429 or "429" in message or "rate limit" in message

    @staticmethod
    def _build_generation_config(
        temperature: float,
        max_tokens: int,
        response_format: Optional[str] = None,
    ) -> types.GenerationConfig:
        cfg = types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        if response_format in {"json", "application/json", "json_object"}:
            cfg.response_mime_type = "application/json"
        return cfg

    @staticmethod
    def _extract_text(response: Any) -> str:
        if hasattr(response, "text") and response.text:
            return response.text

        candidates = getattr(response, "candidates", None) or []
        for cand in candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", []) if content else []
            for part in parts:
                text = getattr(part, "text", None)
                if text:
                    return text
        return ""

    @staticmethod
    def _extract_image(response: Any) -> Optional[Dict[str, str]]:
        candidates = getattr(response, "candidates", None) or []
        for cand in candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", []) if content else []
            for part in parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    return {
                        "image_data": inline.data,
                        "mime_type": getattr(inline, "mime_type", "image/png")
                    }
        return None

    @staticmethod
    def _parse_response_text(text: str, expect_json: bool) -> Dict[str, Any]:
        text = text.strip()
        if expect_json:
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return parsed
                return {"result": parsed}
            except Exception:
                logger.warning("Gemini JSON 파싱 실패, raw 텍스트 반환")
                return {"raw": text}
        return {"text": text}

    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        response_format: Optional[str] = "json",
    ) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Gemini API 키가 설정되지 않았습니다.")

        cfg = self._build_generation_config(temperature, max_tokens, response_format)
        expect_json = response_format in {"json", "application/json", "json_object"}
        last_error: Optional[Exception] = None

        async with self.lock:
            await self._respect_rate_limit(model)

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    response = await asyncio.to_thread(
                        self.client.models.generate_content,
                        model=model,
                        contents=prompt,
                        generation_config=cfg,
                    )
                    text = self._extract_text(response)
                    return self._parse_response_text(text, expect_json)

                except Exception as exc:  # pragma: no cover - 외부 API 오류 처리
                    last_error = exc
                    if self._is_rate_limit_error(exc):
                        if attempt == MAX_RETRIES:
                            raise RateLimitError("Gemini 호출이 한도에 도달했습니다.") from exc
                        backoff = BACKOFF_BASE * (2 ** (attempt - 1))
                        logger.warning(f"Gemini 429 감지, {backoff}s 대기 후 재시도 ({attempt}/{MAX_RETRIES})")
                        await asyncio.sleep(backoff)
                        continue
                    raise

        if last_error:
            raise last_error
        raise RuntimeError("Gemini 응답을 받을 수 없습니다.")

    async def generate_image(self, prompt: str, model: str = "gemini-2.0-flash-image") -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Gemini API 키가 설정되지 않았습니다.")

        async with self.lock:
            await self._respect_rate_limit(model)

            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=model,
                    contents=prompt,
                )
                image_payload = self._extract_image(response)
                if image_payload:
                    return image_payload
                logger.warning("Gemini 이미지 응답이 비어 있음, placeholder 반환")
                return {"placeholder": True}
            except Exception as exc:  # pragma: no cover - 외부 API 오류 처리
                if self._is_rate_limit_error(exc):
                    raise RateLimitError("Gemini 이미지 한도 초과") from exc
                logger.error(f"Gemini 이미지 생성 실패: {exc}")
                return {"placeholder": True, "error": str(exc)}

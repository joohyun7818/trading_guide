"""
Claude Haiku 클라이언트 (프로덕션용)
Anthropic API를 httpx로 직접 호출
"""
import json
import logging
from typing import Any, Dict, Optional

import httpx

from api.core.config import settings

logger = logging.getLogger(__name__)

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-3-5-haiku-latest"
DEFAULT_SYSTEM = "당신은 한국 투자자를 위한 친근하고 유머러스한 금융 해설가입니다."


class HaikuClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        if not self.api_key:
            logger.warning("Anthropic API 키가 설정되지 않았습니다.")

    @staticmethod
    def _parse_text(content: Any) -> str:
        if not isinstance(content, list):
            return ""
        texts = [block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"]
        return "\n".join([t for t in texts if t]).strip()

    @staticmethod
    def _convert_to_dict(text: str) -> Dict[str, Any]:
        text = (text or "").strip()
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
            return {"result": parsed}
        except Exception:
            return {"text": text}

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 800,
        system: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("Anthropic API 키가 설정되지 않았습니다.")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": DEFAULT_MODEL,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system or DEFAULT_SYSTEM,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(ANTHROPIC_URL, headers=headers, json=payload)

        if response.status_code >= 400:
            logger.error(f"Haiku 호출 실패: {response.status_code} {response.text}")
            raise RuntimeError(f"Haiku 호출 실패: {response.status_code}")

        data = response.json()
        text = self._parse_text(data.get("content", []))
        return self._convert_to_dict(text)

"""
AlphaFlow US v2 - 설정
pydantic-settings로 환경변수 로드
"""
import os
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """앱 전체 설정"""

    # 환경 설정
    ENV: Literal["development", "production"] = Field(default="development", description="실행 환경")

    # API Keys
    GEMINI_API_KEY: str = Field(default="", description="Gemini API 키")
    ANTHROPIC_API_KEY: str = Field(default="", description="Anthropic API 키 (프로덕션용)")

    # AI 설정
    USE_HAIKU: bool = Field(default=False, description="Haiku 사용 여부 (프로덕션용)")

    # 데이터베이스
    DATABASE_URL: str = Field(
        default="postgresql://alphaflow:alphaflow123@localhost:5432/alphaflow_us",
        description="PostgreSQL 연결 URL"
    )

    # 앱 서버 설정
    APP_HOST: str = Field(default="0.0.0.0", description="API 서버 호스트")
    APP_PORT: int = Field(default=8001, description="API 서버 포트")

    # CORS
    CORS_ORIGINS: str = Field(
        default="http://localhost:5174,http://localhost:3001",
        description="CORS 허용 오리진 (쉼표 구분)"
    )

    # 로깅
    LOG_LEVEL: str = Field(default="INFO", description="로그 레벨")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS 오리진을 리스트로 반환"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# 전역 설정 인스턴스
settings = Settings()

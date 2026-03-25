/**
 * useAI - AI 해설 / 스토리 / 이미지 훅
 * 백엔드에 AI 엔드포인트가 구현되면 활성화됩니다.
 * 현재는 미구현 상태로, 모든 요청은 빈 응답을 반환합니다.
 */
import { useCallback, useMemo, useState } from 'react'
import type { CommentaryResponse, ImageResponse, StoryResponse } from '../types'

const SESSION_KEY = 'alphaflow-session'

export function useAI() {
  const [commentary, setCommentary] = useState<CommentaryResponse | null>(null)
  const [story, setStory] = useState<StoryResponse | null>(null)
  const [image, setImage] = useState<ImageResponse | null>(null)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const sessionId = useMemo(
    () => localStorage.getItem(SESSION_KEY) || 'local',
    [],
  )

  // AI 엔드포인트는 아직 미구현 상태입니다.
  // 백엔드에 /api/ai/commentary, /api/ai/story, /api/ai/image 엔드포인트가
  // 구현되면 아래 주석을 해제하세요.

  const fetchCommentary = useCallback(
    async (_id?: string) => {
      // TODO: AI 엔드포인트 구현 후 활성화
      // const target = _id || sessionId
      // const data = await client.get(`/ai/commentary/${target}`)
      // setCommentary(data.data)
      return null
    },
    [],
  )

  const fetchStory = useCallback(
    async (_id?: string) => {
      // TODO: AI 엔드포인트 구현 후 활성화
      return null
    },
    [],
  )

  const fetchImage = useCallback(
    async (_id?: string) => {
      // TODO: AI 엔드포인트 구현 후 활성화
      return null
    },
    [],
  )

  return {
    sessionId,
    commentary,
    story,
    image,
    loading,
    error,
    fetchCommentary,
    fetchStory,
    fetchImage,
  }
}

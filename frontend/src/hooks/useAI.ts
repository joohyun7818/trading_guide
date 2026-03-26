/**
 * useAI - AI 해설 / 스토리 / 이미지 훅
 * 백엔드에 AI 엔드포인트가 구현되면 활성화됩니다.
 * 현재는 미구현 상태로, 모든 요청은 빈 응답을 반환합니다.
 */
import { useCallback, useMemo, useState } from 'react'
import { getCommentary, getImage, getStory } from '../api/client'
import type { CommentaryResponse, ImageResponse, StoryResponse } from '../types'

const SESSION_KEY = 'alphaflow-session'

export function useAI() {
  const [commentary, setCommentary] = useState<CommentaryResponse | null>(null)
  const [story, setStory] = useState<StoryResponse | null>(null)
  const [image, setImage] = useState<ImageResponse | null>(null)
  const [loadingCount, setLoadingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(
    () => localStorage.getItem(SESSION_KEY) || 'local',
    [],
  )

  const startLoading = () => setLoadingCount((c) => c + 1)
  const endLoading = () => setLoadingCount((c) => Math.max(0, c - 1))

  const fetchCommentary = useCallback(
    async (_id?: string): Promise<CommentaryResponse | null> => {
      const target = _id || sessionId
      if (!target || target === 'local') return null
      startLoading()
      setError(null)
      try {
        const data = await getCommentary(target)
        setCommentary(data)
        return data
      } catch {
        setError('AI 코멘터리를 불러오지 못했습니다.')
        return null
      } finally {
        endLoading()
      }
    },
    [sessionId],
  )

  const fetchStory = useCallback(
    async (periodKey: string, _id?: string): Promise<StoryResponse | null> => {
      const target = _id || sessionId
      if (!target || target === 'local') return null
      startLoading()
      setError(null)
      try {
        const data = await getStory(target, periodKey)
        setStory(data)
        return data
      } catch {
        setError('AI 스토리를 불러오지 못했습니다.')
        return null
      } finally {
        endLoading()
      }
    },
    [sessionId],
  )

  const fetchImage = useCallback(
    async (_id?: string): Promise<ImageResponse | null> => {
      const target = _id || sessionId
      if (!target || target === 'local') return null
      startLoading()
      setError(null)
      try {
        const data = await getImage(target)
        setImage(data)
        return data
      } catch {
        setError('AI 이미지를 불러오지 못했습니다.')
        return null
      } finally {
        endLoading()
      }
    },
    [sessionId],
  )

  return {
    sessionId,
    commentary,
    story,
    image,
    loading: loadingCount > 0,
    error,
    fetchCommentary,
    fetchStory,
    fetchImage,
  }
}

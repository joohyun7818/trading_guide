import { useCallback, useMemo, useState } from 'react'
import { getCommentary, getImage, getStory } from '../api/client'
import type { CommentaryResponse, ImageResponse, StoryResponse } from '../types'

export function useAI() {
  const [commentary, setCommentary] = useState<CommentaryResponse | null>(null)
  const [story, setStory] = useState<StoryResponse | null>(null)
  const [image, setImage] = useState<ImageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(
    () => localStorage.getItem('alphaflow-session') || 'local',
    [],
  )

  const fetchCommentary = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await getCommentary(target)
        setCommentary(data)
        return data
      } catch {
        setError('AI 해설을 불러오지 못했습니다.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  const fetchStory = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await getStory(target)
        setStory(data)
        return data
      } catch {
        setError('스토리를 생성하지 못했습니다.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  const fetchImage = useCallback(
    async (id?: string) => {
      const target = id || sessionId
      setLoading(true)
      setError(null)
      try {
        const data = await getImage(target)
        setImage(data)
        return data
      } catch {
        setError('이미지를 불러오지 못했습니다.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
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

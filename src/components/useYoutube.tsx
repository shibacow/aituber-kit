import { useCallback, useEffect, useRef } from 'react'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import { fetchAndProcessComments } from '@/features/youtube/customComments'
import { BcsrvWebSocketClient } from '@/features/youtube/bcsrvWebSocketClient'

const INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS = 1000 // 1秒

interface Params {
  handleSendChat: (text: string) => Promise<void>
}

const useYoutube = ({ handleSendChat }: Params) => {
  const youtubePlaying = settingsStore((s) => s.youtubePlaying)
  const websocketClientRef = useRef<BcsrvWebSocketClient | null>(null)

  const fetchAndProcessCommentsCallback = useCallback(async () => {
    const ss = settingsStore.getState()
    const hs = homeStore.getState()

    if (
      !ss.youtubeLiveId ||
      !ss.youtubeApiKey ||
      hs.chatProcessing ||
      hs.chatProcessingCount > 0 ||
      !ss.youtubeMode ||
      !ss.youtubePlaying
    ) {
      return
    }

    console.log('Call fetchAndProcessComments from customComments.ts !!!')
    await fetchAndProcessComments(handleSendChat)
  }, [handleSendChat])

  useEffect(() => {
    if (!youtubePlaying) return
    fetchAndProcessCommentsCallback()

    const intervalId = setInterval(() => {
      fetchAndProcessCommentsCallback()
    }, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS)

    return () => clearInterval(intervalId)
  }, [youtubePlaying, fetchAndProcessCommentsCallback])

  useEffect(() => {
    if (youtubePlaying) {
      if (!websocketClientRef.current) {
        websocketClientRef.current = new BcsrvWebSocketClient()
      }

      try {
        websocketClientRef.current.connect()
      } catch (error) {
        console.error('Failed to connect bcsrv WebSocket client:', error)
      }

      return () => {
        websocketClientRef.current?.disconnect()
      }
    }

    websocketClientRef.current?.disconnect()
    websocketClientRef.current = null
  }, [youtubePlaying])
}

export default useYoutube

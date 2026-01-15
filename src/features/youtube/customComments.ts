import { Message } from '@/features/messages/messages'
import settingsStore from '@/features/stores/settings'
import {
  getBestComment,
  getMessagesForSleep,
  getAnotherTopic,
  getMessagesForNewTopic,
  checkIfResponseContinuationIsRequired,
  getMessagesForContinuation,
} from '@/features/youtube/conversationContinuityFunctions'
import { processAIResponse } from '../chat/handlers'
import homeStore from '@/features/stores/home'
import { messageSelectors } from '../messages/messageSelectors'

export const getLiveChatId = async (
  liveId: string,
  youtubeKey: string
): Promise<string> => {
  return liveId;
}

import { useCommentsStore, Comment } from '@/features/stores/useCommentsStore'

const fetchedCommentIds = new Set<string>()

const retrieveLiveComments = async (
  activeLiveChatId: string,
  youtubeKey: string,
  youtubeNextPageToken: string,
  setYoutubeNextPageToken: (token: string) => void
): Promise<Comment[]> => {
  console.log('[customComments] retrieveLiveComments')
  let url =  '/api/customhost/live_comments?live_id=' +encodeURIComponent(activeLiveChatId)
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  type ResponseJson = {
    status: any;
    comments: any[];
  };
  
  const json: ResponseJson = await response.json(); //
  console.log('[customComments] fetched json:')
  console.log(json)
  const items = json.comments
  console.log('[customComments] fetched items:')
  console.log(items)

  const comments = items
    .map((item: any) => ({
      userName: item.user_name,
      userIconUrl: item.profile_image_url,
      message: item.comment || '',
      id: item.id,
      timestamp: item.created_at,
    }))
    .filter(
      (comment: Comment) =>
        comment.message !== '' && !comment.message.startsWith('#')
    )
    .filter((comment: Comment) => {
      if (fetchedCommentIds.has(comment.id)) {
        return false
      }

      fetchedCommentIds.add(comment.id)
      return true
    })

  if (comments.length === 0) {
    return []
  }
  console.log("fetchedCommentIds=",fetchedCommentIds);

  return comments
}

export const fetchAndProcessComments = async (
  handleSendChat: (text: string) => void
): Promise<void> => {
  console.log('[customComments] fetchAndProcessComments invoked')
  const ss = settingsStore.getState()
  const hs = homeStore.getState()
  const chatLog = messageSelectors.getTextAndImageMessages(hs.chatLog)

  try {
    const liveChatId = await getLiveChatId(ss.youtubeLiveId, ss.youtubeApiKey)

    if (liveChatId) {
      // 会話の継続が必要かどうかを確認
      if (
        !ss.youtubeSleepMode &&
        ss.youtubeContinuationCount < 1 &&
        ss.conversationContinuityMode
      ) {
        const isContinuationNeeded =
          await checkIfResponseContinuationIsRequired(chatLog)
        if (isContinuationNeeded) {
          const continuationMessage = await getMessagesForContinuation(
            ss.systemPrompt,
            chatLog
          )
          processAIResponse(continuationMessage)
          settingsStore.setState({
            youtubeContinuationCount: ss.youtubeContinuationCount + 1,
          })
          if (ss.youtubeNoCommentCount < 1) {
            settingsStore.setState({ youtubeNoCommentCount: 1 })
          }
          return
        }
      }
      settingsStore.setState({ youtubeContinuationCount: 0 })

      // WebSocketコメントを取得してストアをクリア
      const wsComments = useCommentsStore.getState().comments;
      useCommentsStore.getState().clearComments();

      // APIコメントを取得
      const apiComments = await retrieveLiveComments(
        liveChatId,
        ss.youtubeApiKey,
        ss.youtubeNextPageToken,
        (token: string) => settingsStore.setState({ youtubeNextPageToken: token })
      )

      // コメントを結合
      const allComments = [...wsComments, ...apiComments];

      // ランダムなコメントを選択して送信
      if (allComments.length > 0) {
        settingsStore.setState({ youtubeNoCommentCount: 0 })
        settingsStore.setState({ youtubeSleepMode: false })
        let selectedComment = ''
        if (ss.conversationContinuityMode) {
          selectedComment = await getBestComment(chatLog, allComments)
        } else {
          selectedComment =
            allComments[Math.floor(Math.random() * allComments.length)]
              .message
        }
        console.log('[customComments] selectedComment:', selectedComment)

        handleSendChat(selectedComment)
      } else {
        const noCommentCount = ss.youtubeNoCommentCount + 1
        if (ss.conversationContinuityMode) {
          if (
            noCommentCount < 3 ||
            (3 < noCommentCount && noCommentCount < 6)
          ) {
            // 会話の続きを生成
            const continuationMessage = await getMessagesForContinuation(
              ss.systemPrompt,
              chatLog
            )
            processAIResponse(continuationMessage)
          } else if (noCommentCount === 3) {
            // 新しいトピックを生成
            const anotherTopic = await getAnotherTopic(chatLog)
            console.log('[customComments] anotherTopic:', anotherTopic)
            const newTopicMessage = await getMessagesForNewTopic(
              ss.systemPrompt,
              chatLog,
              anotherTopic
            )
            processAIResponse(newTopicMessage)
          } else if (noCommentCount === 6) {
            // スリープモードにする
            const messagesForSleep = await getMessagesForSleep(
              ss.systemPrompt,
              chatLog
            )
            processAIResponse(messagesForSleep)
            settingsStore.setState({ youtubeSleepMode: true })
          }
        }
        console.log('[customComments] noCommentCount:', noCommentCount)
        settingsStore.setState({ youtubeNoCommentCount: noCommentCount })
      }
    }
  } catch (error) {
    console.error('[customComments] Error fetching comments:', error)
  }
}

export const BCSVR_MESSAGE_TYPE = {
  COMMENT: 1,
  JOINED: 2,
  GIFT_SENT: 3,
  FOLLOWED: 4,
  LIVE_ENDED: 11,
  LIVE_STREAMING_LOW_QUALITY: 21,
} as const;

export type BcsvrMessageType =
  (typeof BCSVR_MESSAGE_TYPE)[keyof typeof BCSVR_MESSAGE_TYPE];

export interface BcsvrMessage {
  t: BcsvrMessageType;
  created_at: number;
}

export interface BcsvrCommentMessage extends BcsvrMessage {
  t: typeof BCSVR_MESSAGE_TYPE.COMMENT;
  lci: string; // LiveCommentID
  u: string; // UserID
  ac: string; // ユーザー名
  cm: string; // コメント本文
  speech?: string; // 音声読み上げテキスト
  iurl: string; // プロフィール画像URL
  burl?: string; // バッジ画像URL
  is_moderator?: number; // モデレーターフラグ
}

export interface BcsvrGiftMessage extends BcsvrMessage {
  t: typeof BCSVR_MESSAGE_TYPE.GIFT_SENT;
  u: string; // UserID
  ac: string; // ユーザー名
  gift_id: string; // ギフトID
  gift_title: string; // ギフト名
  count: number; // 送信数
  coins: string; // コイン数
  iurl: string; // プロフィール画像URL
  burl?: string; // バッジ画像URL
}

export interface BcsvrFollowedMessage extends BcsvrMessage {
  t: typeof BCSVR_MESSAGE_TYPE.FOLLOWED;
  u: string; // UserID
  ac: string; // ユーザー名
  iurl: string; // プロフィール画像URL
  burl?: string; // バッジ画像URL
}

export type BcsvrAnyMessage =
  | BcsvrCommentMessage
  | BcsvrGiftMessage
  | BcsvrFollowedMessage
  | BcsvrMessage;

export interface BcsvrConfig {
  host: string;
  port: number;
  channel: string;
}

// eslint-disable-next-line no-shadow
export enum BcsvrConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR",
}

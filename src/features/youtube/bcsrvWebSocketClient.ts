export type BcsrvWebSocketHandlers = {
  onOpen?: (event: Event) => void
  onMessage?: (message: unknown, rawEvent: MessageEvent) => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
}

const getEnvValue = (key: string): string | undefined => {
  return process.env[key] || process.env[`NEXT_PUBLIC_${key}`]
}

const buildWebSocketUrl = (): string => {
  const endpoint =
    getEnvValue('BCSRV_WEBSOCKET_URL') || getEnvValue('BCSRV_WS_URL')

  if (!endpoint) {
    throw new Error('BCSRV_WEBSOCKET_URL is not set')
  }

  const url = new URL(endpoint)
  const bcsrvKey = getEnvValue('BCSRV_KEY')
  if (bcsrvKey && !url.searchParams.has('bcsrv_key')) {
    url.searchParams.set('bcsrv_key', bcsrvKey)
  }

  return url.toString()
}

const parseMessage = (data: MessageEvent['data']): unknown => {
  if (typeof data !== 'string') {
    return data
  }

  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

export class BcsrvWebSocketClient {
  private websocket: WebSocket | null = null
  private pingIntervalId: ReturnType<typeof setInterval> | null = null

  constructor(private readonly handlers: BcsrvWebSocketHandlers = {}) {}

  connect(): WebSocket {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return this.websocket
    }

    if (typeof WebSocket === 'undefined') {
      throw new Error('WebSocket is not available in this environment')
    }

    const ws = new WebSocket(buildWebSocketUrl())
    ws.addEventListener('open', (event) => {
      this.startPing()
      this.handlers.onOpen?.(event)
    })
    ws.addEventListener('message', (event) => {
      const parsed = parseMessage(event.data)
      this.handlers.onMessage?.(parsed, event)
    })
    ws.addEventListener('error', (event) => this.handlers.onError?.(event))
    ws.addEventListener('close', (event) => {
      this.stopPing()
      this.handlers.onClose?.(event)
    })

    this.websocket = ws
    return ws
  }

  send(payload: unknown): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    this.websocket.send(body)
  }

  disconnect(): void {
    this.stopPing()
    this.websocket?.close()
    this.websocket = null
  }

  private startPing(): void {
    if (this.pingIntervalId) {
      return
    }

    this.pingIntervalId = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send('PING')
      }
    }, 60000)
  }

  private stopPing(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId)
      this.pingIntervalId = null
    }
  }
}

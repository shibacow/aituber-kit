import { BcsvrAnyMessage, BcsvrConnectionState } from "@/features/types/types";

export type BcsrvWebSocketHandlers = {
  onOpen?: (event: Event) => void
  onMessage?: (message: unknown, rawEvent: MessageEvent) => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
}


const buildWebSocketUrl = (): string => {
  const endpoint = process.env.NEXT_PUBLIC_BCSRV_WEBSOCKET_URL;

  if (!endpoint) {
    throw new Error('BCSRV_WEBSOCKET_URL is not set')
  }

  const url = new URL(endpoint)
  return url.toString()
}


const handleMessage=(data: string): unknown =>{
  if (data.startsWith("MSG\t")) {
    const parts = data.split("\t");
    if (parts.length >= 3) {
      const channel = parts[1];
      const json = parts[2];
      try{
          const message = JSON.parse(json) as BcsvrAnyMessage;
          console.log(message);
          return message;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            "[BcsvrClient] Failed to parse message:",
            error,
            json,
          );
        }
      }
    } else if (data.startsWith("ACK\t")) {
    console.log(data);
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
    console.log(process.env.NEXT_PUBLIC_BCSRV_WEBSOCKET_URL)

    const ws = new WebSocket(buildWebSocketUrl());
    ws.addEventListener('open', (event) => {
      this.sub()
      this.startPing()
      this.handlers.onOpen?.(event)
    })
    ws.addEventListener('message', (event) => {
      const parsed =  handleMessage(event.data)
      console.log(parsed);
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
  private sub(): void {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        const bcsrvKey = process.env.NEXT_PUBLIC_BCSRV_KEY
        console.log(`SUB\t${bcsrvKey}`);
        this.websocket.send(`SUB\t${bcsrvKey}`)
      }
  }

  send(payload: unknown): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    this.websocket.send(body)
  }
  private unsub():void {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        const bcsrvKey = process.env.NEXT_PUBLIC_BCSRV_KEY
        console.log(`UNS\t${bcsrvKey}`);
        this.websocket.send(`UNS\t${bcsrvKey}`)
      }

  }

  disconnect(): void {
    this.stopPing()
    this.unsub()
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

import { Transport } from "litehouse-common";

/** A transport that uses browser WebSockets. */
export class BrowserWebSocketTransport implements Transport {
  constructor(private readonly ws: WebSocket) {}

  async send(message: Uint8Array): Promise<void> {
    this.ws.send(message);
  }

  onReceive(handler: (message: Uint8Array) => void): void {
    this.ws.addEventListener('message', e => {
      handler(new Uint8Array(e.data));
    });
  }

  async close(): Promise<void> {
    this.ws.close();
  }
}

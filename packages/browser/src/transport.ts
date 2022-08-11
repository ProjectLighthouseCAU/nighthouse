import { Logger, NoopLogHandler, Transport } from "nighthouse-common";

/** A transport that uses browser WebSockets. */
export class BrowserWebSocketTransport implements Transport {
  constructor(
    private readonly ws: WebSocket,
    private readonly logger: Logger = new Logger(new NoopLogHandler()),
  ) {
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('error', e => {
      logger.error(`WebSocket error: ${e}`);
    });
    ws.addEventListener('close', () => {
      logger.info(`WebSocket closed`);
    });
  }

  async send(message: Uint8Array): Promise<void> {
    await this.ws.send(message);
  }

  async ready(): Promise<void> {
    if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.CLOSED) {
      await new Promise<void>(resolve => {
        this.ws.addEventListener('open', () => {
          resolve();
        });
      });
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Could not connect to WebSocket!");
    }
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

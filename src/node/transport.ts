import { Logger, NoopLogHandler, Transport } from '../common';
import { WebSocket } from 'ws';

/** A transport that uses the 'ws' library for Node. */
export class NodeWebSocketTransport implements Transport {
  constructor(
    private readonly ws: WebSocket,
    private readonly logger: Logger = new Logger(new NoopLogHandler()),
  ) {
    this.ws.addEventListener('error', e => {
      logger.error(`WebSocket error: ${e}`);
    });
  }

  async send(message: Uint8Array): Promise<void> {
    await this.ws.send(message);
  }

  async ready(): Promise<void> {
    if (this.ws.readyState === WebSocket.CONNECTING) {
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
      if (Buffer.isBuffer(e.data)) {
        handler(new Uint8Array(e.data));
      } else {
        // Not a buffer!
      }
    });
  }

  async close(): Promise<void> {
    this.ws.close();
  }
}

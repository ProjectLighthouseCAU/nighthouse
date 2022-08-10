import { Transport } from "../common";
import { WebSocket } from "ws";

/** A transport that uses the 'ws' library for Node. */
export class NodeTransport implements Transport {
  constructor(private readonly ws: WebSocket) {}

  async send(message: Uint8Array): Promise<void> {
    this.ws.send(message);
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
}

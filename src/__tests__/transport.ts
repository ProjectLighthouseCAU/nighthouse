import { Coder } from '../common/coder';
import { Transport } from '../common/transport';

export class TestTransport<T, U> implements Transport {
  private handlers: ((message: Uint8Array) => void)[] = [];

  constructor(
    private coder: Coder,
    private responder: (value: T) => U
  ) {}

  async send(rawMessage: Uint8Array): Promise<void> {
    const message = this.coder.decode(rawMessage);
    const response = this.responder(message);
    const rawResponse = this.coder.encode(response);
    for (const handler of this.handlers) {
      handler(rawResponse);
    }
  }

  onReceive(handler: (message: Uint8Array) => void): void {
    this.handlers.push(handler);
  }

  async ready(): Promise<void> {
    // Do nothing
  }

  async close(): Promise<void> {
    // Do nothing
  }
}

import { Transport } from "./transport";
import * as msgpack from '@msgpack/msgpack';
import { ServerMessage } from "./types";
import { Logger } from "./log";

/** A connection to the lighthouse. */
export class Lighthouse {
  constructor(
    private readonly transport: Transport,
    private readonly logger: Logger
  ) {
    transport.onReceive(async raw => {
      const message = msgpack.decode(raw);
      // TODO: Check that the message actually conforms to ServerMessage
      await this.handle(message as ServerMessage<unknown>);
    });
  }

  /** Sends an arbitrary message. */
  async send<T>(message: T): Promise<void> {
    const raw = msgpack.encode(message);
    this.transport.send(raw);
  }

  /** Handles an arbitrary (received) message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    // TODO
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

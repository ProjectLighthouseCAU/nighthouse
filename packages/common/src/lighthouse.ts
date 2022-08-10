import { Transport } from "./transport";
import { Auth, ClientMessage, ServerMessage, Verb } from "./types";
import { Logger, NoopLogHandler } from "./log";
import { Coder, MessagePackCoder } from "./coder";

/** A connection to the lighthouse. */
export class Lighthouse {
  private requestId: number = 0;
  private responseHandlers: Map<number, (message: ServerMessage<unknown>) => void> = new Map();

  constructor(
    private readonly auth: Auth,
    private readonly transport: Transport,
    private readonly logger: Logger = new Logger(new NoopLogHandler()),
    private readonly coder: Coder = new MessagePackCoder(),
  ) {
    transport.onReceive(async raw => {
      const message = coder.decode(raw);
      // TODO: Check that the message actually conforms to ServerMessage
      await this.handle(message as ServerMessage<unknown>);
    });
  }

  // TODO: Input handling

  /** Sends a display. */
  async sendDisplay(rgbValues: Uint8Array): Promise<ServerMessage<unknown>> {
    return this.sendRequest('PUT', ['user', this.auth.USER, 'model'], rgbValues);
  }

  /** Requests a stream. */
  async requestStream(): Promise<ServerMessage<unknown>> {
    return this.sendRequest('STREAM', ['user', this.auth.USER, 'model'], {});
  }

  /** Sends a request. */
  async sendRequest<T>(verb: Verb, path: string[], payload: T): Promise<ServerMessage<unknown>> {
    // TODO: Handle response
    const message: ClientMessage<T> = {
      AUTH: this.auth,
      REID: this.requestId++,
      VERB: verb,
      PATH: path,
      META: {},
      PAYL: payload,
    };
    const raw = this.coder.encode(message);
    const responsePromise = this.receiveResponse(message.REID);
    await this.transport.send(raw);
    return await responsePromise;
  }

  /** Sends an arbitrary message. */
  async send<T>(message: T): Promise<void> {
    const raw = this.coder.encode(message);
    this.transport.send(raw);
  }
  
  /** Asynchronously receives a response for the given request id. */
  private async receiveResponse(id: number): Promise<ServerMessage<unknown>> {
    return new Promise((resolve, reject) => {
      this.responseHandlers[id] = message => {
        if (message.RNUM === 200) {
          resolve(message);
        } else {
          reject(JSON.stringify(message));
        }
      };
    });
  }

  /** Handles an arbitrary (received) message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    const id = message.REID;
    if (id) {
      const handler = this.responseHandlers.get(id);
      if (handler) {
        handler(message);
        this.responseHandlers.delete(id);
      }
    } else {
      this.logger.warning(`Unhandled message: ${JSON.stringify(message)}`);
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

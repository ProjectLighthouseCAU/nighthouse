import { Transport } from "./transport";
import { Auth, ClientMessage, isServerMessage, ServerMessage, Verb } from "./types";
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
      if (raw.length > 0) {
        const message = coder.decode(raw);
        if (isServerMessage(message)) {
          await this.handle(message);
        } else {
          logger.warning(`Got unknown message: ${JSON.stringify(message)}`);
        }
      }
    });
  }

  /** A promise that resolves once ready. */
  async ready(): Promise<void> {
    await this.transport.ready();
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
    const message: ClientMessage<T> = {
      AUTH: this.auth,
      REID: this.requestId++,
      VERB: verb,
      PATH: path,
      META: {},
      PAYL: payload,
    };
    const responsePromise = this.receiveResponse(message.REID);
    await this.send(message);
    return await responsePromise;
  }

  /** Sends a client message. */
  async send<P>(message: ClientMessage<P>): Promise<void> {
    const raw = this.coder.encode(message);
    await this.transport.send(raw);
  }
  
  /** Asynchronously receives a response for the given request id. */
  private async receiveResponse(id: number): Promise<ServerMessage<unknown>> {
    return new Promise((resolve, reject) => {
      this.responseHandlers[id] = (message: ServerMessage<unknown>) => {
        if (message.RNUM === 200) {
          resolve(message);
        } else {
          reject(JSON.stringify(message));
        }
      };
    });
  }

  /** Handles a server message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    const id = message.REID;
    if (id !== undefined) {
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

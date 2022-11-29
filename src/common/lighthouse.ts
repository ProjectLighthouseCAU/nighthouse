import { Transport } from "./transport";
import { Auth, ClientMessage, InputEvent, isServerMessage, ServerMessage, SingleVerb, StreamingVerb, Verb } from "./types";
import { Logger, NoopLogHandler } from "./log";
import { Coder, MessagePackCoder } from "./coder";

/** A connection to the lighthouse. */
export class Lighthouse {
  /** The current request id. Automatically increments for every request. */
  private requestId: number = 0;

  /** Handlers for response messages. */
  private responseHandlers: Map<number, (message: ServerMessage<unknown>) => void> = new Map();
  /** Handlers for other server messages. */
  private eventHandlers: ((message: ServerMessage<unknown>) => void)[] = [];

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

  /** Sends a frame or an input event to the user's model. */
  async putModel(payload: Uint8Array | InputEvent, user: string = this.auth.USER): Promise<ServerMessage<unknown>> {
    return this.perform('PUT', ['user', user, 'model'], payload);
  }

  /** Streams the user's model (including e.g. key/controller events). */
  async streamModel(user: string = this.auth.USER): Promise<AsyncIterable<ServerMessage<unknown>>> {
    return this.stream('STREAM', ['user', user, 'model'], {});
  }

  /** Performs a single request to the given path with the given payload. */
  async perform<T>(verb: SingleVerb, path: string[], payload: T): Promise<ServerMessage<unknown>> {
    const requestId = await this.sendRequest(verb, path, payload);
    return await this.receiveSingle(requestId);
  }

  /** Performs a streaming request to the given path with the given payload. */
  async stream<T>(verb: StreamingVerb, path: string[], payload: T): Promise<AsyncIterable<ServerMessage<unknown>>> {
    const requestId = await this.sendRequest(verb, path, payload);
    return this.receiveStreaming(requestId);
  }

  /** Sends a request. */
  private async sendRequest<T>(verb: Verb, path: string[], payload: T): Promise<number> {
    const requestId = this.requestId++;
    const message: ClientMessage<T> = {
      AUTH: this.auth,
      REID: requestId,
      VERB: verb,
      PATH: path,
      META: {},
      PAYL: payload,
    };
    await this.send(message);
    return requestId;
  }

  /** Sends a client message. */
  async send<P>(message: ClientMessage<P>): Promise<void> {
    const raw = this.coder.encode(message);
    await this.transport.send(raw);
  }

  /** Receives a response for the given request id. */
  private async receiveSingle(id: number): Promise<ServerMessage<unknown>> {
    return new Promise((resolve, reject) => {
      this.responseHandlers[id] = (message: ServerMessage<unknown>) => {
        if (message.RNUM === 200) {
          resolve(message);
        } else {
          reject(JSON.stringify(message));
        }
        this.responseHandlers.delete(id);
      };
    });
  }

  /** Receives a stream of responses for the given request id. */
  private async* receiveStreaming(id: number): AsyncIterable<ServerMessage<unknown>> {
    try {
      while (true) {
        yield await this.receiveSingle(id);
      }
    } finally {
      this.responseHandlers.delete(id);
    }
  }

  /** Handles a server message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    const responseHandler = this.responseHandlers.get(message.REID);
    if (responseHandler) {
      // A response handler exists, invoke it.
      responseHandler(message);
      this.responseHandlers.delete(message.REID);
    } else {
      // No response handler exists, treat it as an independent event.
      if (this.eventHandlers.length > 0) {
        for (const eventHandler of this.eventHandlers) {
          eventHandler(message);
        }
      } else {
        this.logger.warning(`Got unhandled event: ${JSON.stringify(message)}`);
      }
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

import { Transport } from "./transport";
import { Auth, ClientMessage, InputEvent, isServerMessage, ServerMessage, SingleVerb, Verb } from "./protocol";
import { Logger, NoopLogHandler } from "./log";
import { Coder, MessagePackCoder } from "./coder";
import { LaserMetrics } from "./protocol/metrics";

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
    return await this.put(['user', user, 'model'], payload);
  }

  /** Streams the user's model (including e.g. key/controller events). */
  async *streamModel(user: string = this.auth.USER): AsyncIterable<ServerMessage<unknown>> {
    yield* this.stream(['user', user, 'model'], {});
  }

  /** Fetches lamp server metrics. */
  async getLaserMetrics(): Promise<ServerMessage<LaserMetrics>> {
    return await this.get(['metrics', 'laser']) as ServerMessage<LaserMetrics>;
  }

  /** Combines PUT and CREATE. Requires CREATE and WRITE permission. */
  async post<T>(path: string[], payload: T): Promise<ServerMessage<unknown>> {
    return await this.perform('POST', path, payload);
  }

  /** Updates the resource at the given path with the given payload. Requires WRITE permission. */
  async put<T>(path: string[], payload: T): Promise<ServerMessage<unknown>> {
    return await this.perform('PUT', path, payload);
  }

  /** Creates a resource at the given path. Requires CREATE permission. */
  async create(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('CREATE', path, {});
  }

  /** Deletes a resource at the given path. Requires DELETE permission. */
  async delete(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('DELETE', path, {});
  }

  /** Creates a directory at the given path. Requires CREATE permission. */
  async mkdir(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('MKDIR', path, {});
  }

  /** Lists the directory tree at the given path. Requires READ permission. */
  async list(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('LIST', path, {});
  }

  /** Gets the resource at the given path. Requires READ permission. */
  async get(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('GET', path, {});
  }

  /** Links the given source to the given destination path. Requires WRITE permission for the destination and READ for the source. */
  async link(srcPath: string[], destPath: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('LINK', destPath, srcPath);
  }

  /** Unlinks the given source from the given destination path. Requires WRITE permission for the destination. */
  async unlink(srcPath: string[], destPath: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('UNLINK', destPath, srcPath);
  }

  /** Performs a single request to the given path with the given payload. */
  async perform<T>(verb: SingleVerb, path: string[], payload: T): Promise<ServerMessage<unknown>> {
    const requestId = await this.sendRequest(verb, path, payload);
    return await this.receiveSingle(requestId);
  }

  /** Performs a streaming request to the given path with the given payload. */
  async *stream<T>(path: string[], payload: T): AsyncIterable<ServerMessage<unknown>> {
    const requestId = await this.sendRequest('STREAM', path, payload);
    yield* this.receiveStreaming(requestId);
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
      this.responseHandlers.set(id, (message: ServerMessage<unknown>) => {
        this.responseHandlers.delete(id);
        if (message.RNUM === 200) {
          resolve(message);
        } else {
          reject(JSON.stringify(message));
        }
      });
    });
  }

  /** Receives a stream of responses for the given request id. */
  private async* receiveStreaming(id: number): AsyncIterable<ServerMessage<unknown>> {
    try {
      const nextPromises = [];

      const pushPromise = () => {
        nextPromises.push(new Promise((resolve, reject) => {
          // TODO: Error handling, perhaps factor it out from receiveSingle?
          this.responseHandlers.set(id, (message: ServerMessage<unknown>) => {
            pushPromise();
            resolve(message);
          });
        }));
      }

      pushPromise();

      while (true) {
        const promise = nextPromises.shift();
        yield await promise;
      }
    } finally {
      this.logger.debug(`Deleting stream handler for ${id}`);
      this.responseHandlers.delete(id);
    }
  }

  /** Handles a server message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    const responseHandler = this.responseHandlers.get(message.REID);
    if (responseHandler) {
      // A response handler exists, invoke it.
      responseHandler(message);
    } else {
      // No response handler exists, treat it as an independent event.
      if (this.eventHandlers.length > 0) {
        for (const eventHandler of this.eventHandlers) {
          eventHandler(message);
        }
      } else {
        this.logger.warning(`Got unhandled event for id ${message.REID}`);
      }
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

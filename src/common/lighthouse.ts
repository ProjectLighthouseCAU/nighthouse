import { Transport } from "./transport";
import { Auth, ClientMessage, InputEvent, isServerMessage, ServerMessage, SingleVerb, Verb } from "./protocol";
import { Logger, NoopLogHandler } from "./log";
import { Coder, MessagePackCoder } from "./coder";
import { LaserMetrics } from "./protocol/metrics";
import { Deferred } from "./deferred";
import { LighthouseClosedError, LighthouseResponseError } from "./error";

/** A connection to the lighthouse. */
export class Lighthouse {
  /** The current request id. Automatically increments for every request. */
  private requestId: number = 0;

  /** Handlers for response messages. */
  private responseHandlers: Map<number, Deferred<ServerMessage<unknown>>> = new Map();

  /** Whether the transport has been closed. */
  private isClosed = false;

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
    if (this.isClosed) {
      throw new LighthouseClosedError(`Cannot send message after lighthouse connection has been closed: ${JSON.stringify(message)}`)
    }
    this.logger.debug(() => `Sending ${JSON.stringify(message)}`);
    const raw = this.coder.encode(message);
    await this.transport.send(raw);
  }

  /** Receives a response for the given request id. */
  private async receiveSingle(id: number): Promise<ServerMessage<unknown>> {
    if (this.isClosed) {
      throw new LighthouseClosedError(`Cannot receive message for id ${id} after lighthouse connection has been closed`);
    }

    const deferred = new Deferred<ServerMessage<unknown>>();

    this.logger.trace(`Registering handler for ${id}`);
    this.responseHandlers.set(id, deferred);

    try {
      const message = await deferred.promise;
      if (message.RNUM === 200) {
        return message;
      } else {
        throw new LighthouseResponseError(id, message);
      }
    } finally {
      this.logger.trace(`Deleting handler for ${id}`);
      this.responseHandlers.delete(id);
    }
  }

  /** Receives a stream of responses for the given request id. */
  private async* receiveStreaming(id: number): AsyncIterable<ServerMessage<unknown>> {
    // We use a queue of promises instead of naively performing `receiveSingle`
    // in a loop to deal with the scenario where the server sends messages
    // faster than we clients can process them.

    const nextPromises: Promise<ServerMessage<unknown>>[] = [];

    try {
      const pushPromise = () => {
        this.logger.trace(`Pushing promise for next response to request ${id}`);
        const deferred = new Deferred<ServerMessage<unknown>>();
        this.responseHandlers.set(id, deferred);
        nextPromises.push(deferred.promise.then(message => {
          pushPromise();
          return message;
        }));
      }

      pushPromise();

      while (true) {
        const promise = nextPromises.shift();
        yield await promise;
      }
    } finally {
      this.logger.trace(`Deleting stream handler for request ${id}`);
      this.responseHandlers.delete(id);
    }
  }

  /** Handles a server message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    const responseHandler = this.responseHandlers.get(message.REID);
    if (responseHandler) {
      // A response handler exists, invoke it.
      responseHandler.resolve(message);
    } else {
      // No response handler exists, warn about it.
      this.logger.warning(`Got unhandled event for id ${message.REID}`);
    }
  }

  async close(): Promise<void> {
    if (this.isClosed) {
      this.logger.warning(`Lighthouse is already closed, ignoring close.`);
      return;
    }
    this.isClosed = true;
    for (const [id, handler] of this.responseHandlers.entries()) {
      handler.reject(new LighthouseClosedError(`The lighthouse connection was closed while waiting for response with id ${id}`));
    }
    await this.transport.close();
  }
}

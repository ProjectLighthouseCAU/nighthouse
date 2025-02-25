import { Transport } from "./transport";
import { Auth, ClientMessage, InputEvent, isServerMessage, ServerMessage, SingleVerb, Verb } from "./protocol";
import { Logger, NoopLogHandler } from "./log";
import { Coder, MessagePackCoder } from "./coder";
import { LaserMetrics } from "./protocol/metrics";
import { Deferred } from "./deferred";
import { LighthouseClosedError, LighthouseResponseError } from "./error";

/**
 * Bookkeeping data for the stream of a resource. Each resource only has one
 * such instance, we demultiplex multiple logical streams of the same resource.
 */
interface ResourceStream {
  /** The original request id used to stream from the server. */
  originalId: number;
  /** All request ids that are listening for this stream. */
  requestIds: number[];
}

/** A connection to the lighthouse. */
export class Lighthouse {
  /** The current request id. Automatically increments for every request. */
  private requestId: number = 0;

  /** Handlers for response messages. */
  private responseHandlers: Map<number, Deferred<ServerMessage<unknown>>> = new Map();

  /** Out-of-order received messages, e.g. if a response is faster than the response handler is registered. */
  private outOfOrderMessages: Map<number, ServerMessage<unknown>[]> = new Map();

  /** Active streams, keyed by the path array encoded as a JSON string. */
  private streamsByPath: Map<string, ResourceStream> = new Map();

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
  async streamModel(user: string = this.auth.USER): Promise<AsyncIterable<ServerMessage<unknown>>> {
    return this.stream(['user', user, 'model']);
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
    return await this.perform('CREATE', path);
  }

  /** Deletes a resource at the given path. Requires DELETE permission. */
  async delete(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('DELETE', path);
  }

  /** Creates a directory at the given path. Requires CREATE permission. */
  async mkdir(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('MKDIR', path);
  }

  /** Lists the directory tree at the given path. Requires READ permission. */
  async list(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('LIST', path);
  }

  /** Gets the resource at the given path. Requires READ permission. */
  async get(path: string[]): Promise<ServerMessage<unknown>> {
    return await this.perform('GET', path);
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
  async perform<T>(verb: SingleVerb, path: string[], payload?: T): Promise<ServerMessage<unknown>> {
    const requestId = await this.sendRequest(verb, path, payload ?? {});
    return await this.receiveSingle(requestId);
  }

  /** Performs a streaming request to the given path with the given payload. */
  async stream<T>(path: string[], payload?: T): Promise<AsyncIterable<ServerMessage<unknown>>> {
    const key = JSON.stringify(path);
    let requestId: number;

    if (this.streamsByPath.has(key) && this.streamsByPath.get(key).requestIds.length > 0) {
      // This path is already being streamed, we only need to add a handler and
      // don't send a `STREAM` request. This request id in this case is only
      // for tracking our client-side handler and not sent to the server.
      requestId = this.requestId++;
      const stream = this.streamsByPath.get(key)
      this.logger.trace(() => `Adding new demuxed stream ${requestId} for ${JSON.stringify(path)} (also streaming this resource: ${JSON.stringify(stream.requestIds)})...`);
      this.streamsByPath.set(key, { ...stream, requestIds: [...stream.requestIds, requestId] });
    } else {
      // This path has not been streamed yet.
      requestId = await this.sendRequest('STREAM', path, payload ?? {});
      this.logger.trace(() => `Registering new stream ${requestId} from ${JSON.stringify(path)}...`);
      this.streamsByPath.set(key, { originalId: requestId, requestIds: [requestId] });
    }

    return (async function* () {
      try {
        this.logger.debug(() => `Starting stream from ${JSON.stringify(path)}...`);
        yield* this.receiveStreaming(requestId);
      } finally {
        const stream = this.streamsByPath.get(key);
        if (stream.requestIds.length > 1) {
          // This path is still being streamed by another consumer
          // TODO: Assert that sr.requestIds contains our request id (once)
          this.streamsByPath.set(key, { ...stream, requestIds: stream.requestIds.filter(id => id !== requestId) });
        } else {
          // We were the last consumer to stream this path, so we can stop it
          // TODO: Assert that length === 1 and that this is exactly our request id
          this.logger.debug(() => `Stopping stream from ${JSON.stringify(path)}...`);
          await this.sendRequest('STOP', path, {});
          this.streamsByPath.delete(key);
        }
      }
    }).bind(this)();
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

    this.logger.trace(`Registering handler for ${id}`);
    const responsePromise = this.receiveResponse(id);

    try {
      const message = await responsePromise;
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

        const responsePromise = this.receiveResponse(id);

        const nextDeferred = new Deferred<ServerMessage<unknown>>();
        nextPromises.push(nextDeferred.promise);

        responsePromise
          .then(response => {
            pushPromise();
            nextDeferred.resolve(response);
          })
          .catch(nextDeferred.reject.bind(nextDeferred));
      }

      pushPromise();

      while (true) {
        console.assert(nextPromises.length > 0);
        const promise = nextPromises.shift();
        yield await promise;
      }
    } catch (e) {
      this.logger.trace(`Error while receiving streaming responses to request ${id}: ${e}`);
      throw e;
    } finally {
      this.logger.trace(`Deleting stream handler for request ${id}`);
      this.responseHandlers.delete(id);
    }
  }

  private receiveResponse(id: number): Promise<ServerMessage<unknown>> {
    const responseHandler = new Deferred<ServerMessage<unknown>>();
    const outOfOrderMessage = this.outOfOrderMessages.get(id)?.shift();

    if (outOfOrderMessage) {
      // Response was already received, return it
      responseHandler.resolve(outOfOrderMessage);
      if (this.outOfOrderMessages.get(id).length === 0) {
        this.outOfOrderMessages.delete(id);
      }
    } else {
      // Register handler to await future response
      this.responseHandlers.set(id, responseHandler);
    }

    return responseHandler.promise;
  }

  /** Handles a server message. */
  private async handle(message: ServerMessage<unknown>): Promise<void> {
    const responseHandler = this.responseHandlers.get(message.REID);
    if (responseHandler) {
      // A response handler exists, invoke it.
      responseHandler.resolve(message);
    } else {
      // No response handler exists (yet?), warn about it.
      const demuxedIds: number[] = [...this.streamsByPath.values()].find(s => s.originalId === message.REID)?.requestIds ?? [message.REID];
      this.logger.warning(() => `Got out-of-order event for id ${message.REID}${demuxedIds.length > 1 ? ` (demuxed to ${JSON.stringify(demuxedIds)})` : ''}`);
      for (const id of demuxedIds) {
        this.outOfOrderMessages.set(id, [...(this.outOfOrderMessages.get(id) ?? []), message]);
      }
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

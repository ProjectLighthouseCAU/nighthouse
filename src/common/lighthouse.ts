import { Transport } from "./transport";
import { Auth, ClientMessage, ControllerEvent, InputEvent, isControllerEvent, isKeyEvent, isServerMessage, KeyEvent, ServerMessage, Verb } from "./types";
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

  /** Adds a key event handler. Receiving these events requires calling `requestStream`. */
  addKeyHandler(handler: (event: KeyEvent) => void): void {
    this.eventHandlers.push(message => {
      const payload = message.PAYL;
      if (isKeyEvent(payload)) {
        handler(payload);
      }
    });
  }

  /** Adds a controller event handler. Receiving these events requires calling `requestStream`. */
  addControllerHandler(handler: (event: ControllerEvent) => void): void {
    this.eventHandlers.push(message => {
      const payload = message.PAYL;
      if (isControllerEvent(payload)) {
        handler(payload);
      }
    });
  }

  /** Adds a display event handler. Receiving these events requires calling `requestStream`. */
  addDisplayHandler(handler: (event: Uint8Array) => void): void {
    this.eventHandlers.push(message => {
      const payload = message.PAYL;
      if (payload instanceof Uint8Array) {
        handler(payload);
      }
    });
  }

  /** Sends a display. */
  async sendDisplay(rgbValues: Uint8Array): Promise<ServerMessage<unknown>> {
    return this.sendRequest('PUT', ['user', this.auth.USER, 'model'], rgbValues);
  }

  /** Sends an input event. */
  async sendInput(input: InputEvent): Promise<ServerMessage<unknown>> {
    return this.sendRequest('PUT', ['user', this.auth.USER, 'model'], input);
  }

  /** Requests a stream. Required to receive key/controller events. */
  async requestStream(user: string = this.auth.USER): Promise<ServerMessage<unknown>> {
    return this.sendRequest('STREAM', ['user', user, 'model'], {});
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
    const responseHandler = this.responseHandlers.get(message.REID);
    if (responseHandler) {
      // A response handler exists, invoke it.
      responseHandler(message);
      this.responseHandlers.delete(message.REID);
    } else {
      // No response handler exists, treat it as an independent event.
      for (const eventHandler of this.eventHandlers) {
        eventHandler(message);
      }
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}

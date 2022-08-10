/**
 * A transport for sending and receiving messages.
 * Most implementations use an underlying WebSocket connection.
 */
export interface Transport {
  /** Sends the given message. */
  send<T>(message: T): Promise<void>;

  /** Registers the given handler for incoming messages. */
  onReceive<T>(handler: (message: T) => void): void;
}

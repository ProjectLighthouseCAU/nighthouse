/**
 * A transport for sending and receiving messages.
 * Most implementations use an underlying WebSocket connection.
 */
export interface Transport {
  /** Sends the given message. */
  send(message: Uint8Array): Promise<void>;

  /** Registers the given handler for incoming messages. */
  onReceive(handler: (message: Uint8Array) => void): void;
}

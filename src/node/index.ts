import { Connection, Logger, NoopLogHandler, Options } from '../common';
import { WebSocket } from 'ws';
import { NodeWebSocketTransport } from "./transport";

export * from '../common';

/** Connects to the lighthouse at the given (ws/wss) URL. */
export function connect(opts: Options): Connection {
  const ws = new WebSocket(opts.url);
  const logger = new Logger(opts.logHandler ?? new NoopLogHandler());
  const transport = new NodeWebSocketTransport(ws, logger);
  return new Connection(opts.auth, transport, logger);
}

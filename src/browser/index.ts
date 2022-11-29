import { Lighthouse, Logger, NoopLogHandler, Options } from '../common';
import { BrowserWebSocketTransport } from "./transport";

export * from '../common';

/** Connects to the lighthouse at the given (ws/wss) URL. */
export function connect(opts: Options): Lighthouse {
  const ws = new WebSocket(opts.url);
  const logger = new Logger(opts.logHandler ?? new NoopLogHandler());
  const transport = new BrowserWebSocketTransport(ws, logger);
  return new Lighthouse(opts.auth, transport, logger);
}

import { Lighthouse, Logger, LogLevel, NoopLogHandler, Options } from "../common";
import { BrowserTransport } from "./transport";

/** Connects to the lighthouse at the given (ws/wss) URL. */
export function connect(opts: Options): Lighthouse {
  const ws = new WebSocket(opts.url);
  const transport = new BrowserTransport(ws);
  const logger = new Logger(opts.logHandler);
  return new Lighthouse(transport, logger);
}

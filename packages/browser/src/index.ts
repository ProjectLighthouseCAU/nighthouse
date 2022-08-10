import { Lighthouse, Logger, NoopLogHandler, Options } from "litehouse-common";
import { BrowserWebSocketTransport } from "./transport";

export * from "litehouse-common";

/** Connects to the lighthouse at the given (ws/wss) URL. */
export function connect(opts: Options): Lighthouse {
  const ws = new WebSocket(opts.url);
  const transport = new BrowserWebSocketTransport(ws);
  const logger = new Logger(opts.logHandler ?? new NoopLogHandler());
  return new Lighthouse(transport, null!!, logger); // FIXME
}

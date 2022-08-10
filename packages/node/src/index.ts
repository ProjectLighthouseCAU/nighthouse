import { Lighthouse, Logger, NoopLogHandler, Options } from "litehouse-common";
import { WebSocket } from "ws";
import { NodeWebSocketTransport } from "./transport";

export * from "litehouse-common";

/** Connects to the lighthouse at the given (ws/wss) URL. */
export function connect(opts: Options): Lighthouse {
  const ws = new WebSocket(opts.url);
  const logger = new Logger(opts.logHandler ?? new NoopLogHandler());
  const transport = new NodeWebSocketTransport(ws, logger);
  return new Lighthouse(opts.auth, transport, logger);
}

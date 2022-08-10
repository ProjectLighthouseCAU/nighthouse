import { Lighthouse } from "../common";
import { BrowserTransport } from "./transport";

/** Connects to the lighthouse at the given (ws/wss) URL. */
export function connect(url: string): Lighthouse {
  const ws = new WebSocket(url);
  const transport = new BrowserTransport(ws);
  return new Lighthouse(transport);
}

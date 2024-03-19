import { LogHandler } from "./log";
import { Auth } from "./protocol";

/** Configuration options for a lighthouse connection. */
export interface Options {
  /** The authentication credentials. */
  auth: Auth;
  /** The url of the lighthouse WebSocket server. */
  url: string;
  /** A consumer of log messages. */
  logHandler?: LogHandler;
}

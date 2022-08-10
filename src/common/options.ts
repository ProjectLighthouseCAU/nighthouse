import { LogHandler, LogLevel } from "./log";

/** Configuration options for a lighthouse connection. */
export interface Options {
  /** The url of the lighthouse WebSocket server. */
  url: string;
  /** The level to log at. */
  logLevel?: LogLevel;
  /** A consumer of log messages. */
  logHandler?: LogHandler;
}

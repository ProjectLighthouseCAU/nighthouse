/** A log message severity. */
export enum LogLevel {
  Trace = -1,
  Debug,
  Info,
  Warning,
  Error
}

/** A consumer of log messages. */
export interface LogHandler {
  /** Logs the given message at the given level. */
  log(level: LogLevel, msg: string | (() => string)): void;
}

/** A simple logger that swallows the messages and does nothing. */
export class NoopLogHandler implements LogHandler {
  log(): void {
    // Do nothing
  }
}

/** A simple logger that logs to the console. */
export class ConsoleLogHandler implements LogHandler {
  constructor(private readonly prefix: string = '') {}

  log(level: LogLevel, msg: string | (() => string)): void {
    const msgString = typeof msg === 'function' ? msg() : msg;
    const formatted = `${this.prefix}[${this.formatLevel(level)}] ${msgString}`;
    if (level >= LogLevel.Error) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  private formatLevel(level: LogLevel): string {
    switch (level) {
    case LogLevel.Trace: return 'Trace';
    case LogLevel.Debug: return 'Debug';
    case LogLevel.Info: return 'Info';
    case LogLevel.Warning: return 'Warning';
    case LogLevel.Error: return 'Error';
    }
  }
}

/** A log handler wrapper that filters by level. */
export class LeveledLogHandler implements LogHandler {
  constructor(
    private readonly level: LogLevel,
    private readonly handler: LogHandler
  ) {}

  log(level: LogLevel, msg: string | (() => string)): void {
    if (level >= this.level) {
      this.handler.log(level, msg);
    }
  }
}

/** A wrapper around a log handler with some convenience methods. */
export class Logger implements LogHandler {
  constructor(private readonly handler: LogHandler) {}

  /** Logs the given message at the given level. */
  log(level: LogLevel, msg: string | (() => string)): void {
    this.handler.log(level, msg);
  }

  /** Logs the given message at the trace level. */
  trace(msg: string | (() => string)): void {
    this.log(LogLevel.Trace, msg);
  }

  /** Logs the given message at the debug level. */
  debug(msg: string | (() => string)): void {
    this.log(LogLevel.Debug, msg);
  }

  /** Logs the given message at the info level. */
  info(msg: string | (() => string)): void {
    this.log(LogLevel.Info, msg);
  }

  /** Logs the given message at the warning level. */
  warning(msg: string | (() => string)): void {
    this.log(LogLevel.Warning, msg);
  }

  /** Logs the given message at the error level. */
  error(msg: string | (() => string)): void {
    this.log(LogLevel.Error, msg);
  }
}

/** A log message severity. */
export enum LogLevel {
  Debug = 0,
  Info,
  Warning,
  Error
}

/** A consumer of log messages. */
export interface LogHandler {
  /** Logs the given message at the given level. */
  log(level: LogLevel, msg: string): void;
}

/** A simple logger that swallows the messages and does nothing. */
export class NoopLogHandler implements LogHandler {
  log(level: LogLevel, msg: string): void {
    // Do nothing
  }
}

/** A simple logger that logs to the console. */
export class ConsoleLogHandler implements LogHandler {
  log(level: LogLevel, msg: string): void {
    const formatted = `[${this.formatLevel(level)}] msg`;
    if (level >= LogLevel.Error) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  private formatLevel(level: LogLevel): string {
    switch (level) {
    case LogLevel.Debug: return 'Debug';
    case LogLevel.Info: return 'Info';
    case LogLevel.Warning: return 'Warning';
    case LogLevel.Error: return 'Error';
    }
  }
}

/** A wrapper around a log handler that filters by level. */
export class Logger {
  constructor(
    private readonly level: LogLevel,
    private readonly handler: LogHandler,
  ) {}

  /** Logs the given message at the given level. */
  log(level: LogLevel, msg: string): void {
    if (level >= this.level) {
      this.handler.log(level, msg);
    }
  }

  /** Logs the given message at the debug level. */
  debug(msg: string): void {
    this.log(LogLevel.Debug, msg);
  }

  /** Logs the given message at the info level. */
  info(msg: string): void {
    this.log(LogLevel.Info, msg);
  }

  /** Logs the given message at the warning level. */
  warning(msg: string): void {
    this.log(LogLevel.Warning, msg);
  }

  /** Logs the given message at the error level. */
  error(msg: string): void {
    this.log(LogLevel.Error, msg);
  }
}

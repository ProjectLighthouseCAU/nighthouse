/** A log message severity. */
enum LogLevel {
  Debug = 0,
  Info,
  Warning,
  Error
}

/** A consumer of log messages. */
interface LogHandler {
  /** Logs the given message at the given level. */
  log(level: LogLevel, msg: string): void;
}

/** A simple logger that swallows the messages and does nothing. */
class NoopLogHandler implements LogHandler {
  log(level: LogLevel, msg: string): void {
    // Do nothing
  }
}

/** A simple logger that logs to the console. */
class ConsoleLogHandler implements LogHandler {
  log(level: LogLevel, msg: string): void {
    console.log(`[${this.formatLevel(level)}] msg`);
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

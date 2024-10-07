import * as nighthouse from "nighthouse/node";
import { ConsoleLogHandler, LIGHTHOUSE_WINDOWS, LeveledLogHandler, LogLevel, Logger, isInputEvent } from "nighthouse/node";
import * as process from "process";

const logger = new Logger(new LeveledLogHandler(LogLevel.Debug, new ConsoleLogHandler()));

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw Error(`Environment variable ${name} is not defined!`);
  return value;
}

(async () => {
  // Fetch credentials from env
  let url = getEnv('LIGHTHOUSE_URL');
  let username = getEnv('LIGHTHOUSE_USER');
  let token = getEnv('LIGHTHOUSE_TOKEN');

  // Connect to lighthouse
  const lh = nighthouse.connect({
    url,
    auth: { USER: username, TOKEN: token },
    logHandler: logger,
  });

  // Wait until ready
  await lh.ready();
  logger.info('Connected!');

  // Register input handlers
  (async () => {
    for await (const event of lh.streamModel()) {
      const payload = event.PAYL;
      if (isInputEvent(payload)) {
        logger.info(`Got event ${JSON.stringify(payload)}`);
      }
    }
  })();

  // Send some colors
  const values = new Uint8Array(LIGHTHOUSE_WINDOWS * 3);
  for (let i = 0; i < LIGHTHOUSE_WINDOWS * 3; ) {
    const r = Math.round(Math.random() * 255);
    const g = Math.round(Math.random() * 255);
    const b = Math.round(Math.random() * 255);
    values[i++] = r;
    values[i++] = g;
    values[i++] = b;
  }
  await lh.putModel(values);
})();

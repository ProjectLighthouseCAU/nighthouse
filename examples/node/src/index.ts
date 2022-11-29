import * as nighthouse from "nighthouse/node";
import { ConsoleLogHandler, LIGHTHOUSE_WINDOWS, Logger } from "nighthouse/node";
import * as process from "process";

const logger = new Logger(new ConsoleLogHandler());

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw Error(`Environment variable ${name} is not defined!`);
  return value;
}

(async () => {
  // Fetch credentials from env
  let url = getEnv('LIGHTHOUSE_URL');
  let username = getEnv('LIGHTHOUSE_USERNAME');
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
  lh.addKeyHandler(event => {
    logger.info(`Got key event ${JSON.stringify(event)}`);
  });

  // Request stream for user's model
  await lh.requestStream();

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
  await lh.sendDisplay(values);
})();

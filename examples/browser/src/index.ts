import * as nighthouse from "nighthouse-browser";
import { ConsoleLogHandler, LIGHTHOUSE_WINDOWS, Logger } from "nighthouse-browser";

import '../styles.css';

const logger = new Logger(new ConsoleLogHandler());

addEventListener('load', () => {
  const urlField = document.getElementById('lighthouse-url') as HTMLInputElement;
  const usernameField = document.getElementById('lighthouse-username') as HTMLInputElement;
  const tokenField = document.getElementById('lighthouse-token') as HTMLInputElement;
  const connectButton = document.getElementById('lighthouse-connect');

  connectButton.addEventListener('click', async () => {
    // Connect to lighthouse
    const lh = await nighthouse.connect({
      url: urlField.value,
      auth: { USER: usernameField.value, TOKEN: tokenField.value },
      logHandler: logger,
    });

    // Wait until ready
    await lh.ready();
    logger.info('Connected!');

    // Register event handlers
    lh.addKeyHandler(event => {
      logger.info(`Got key event ${JSON.stringify(event)}`);
    });
    lh.addDisplayHandler(event => {
      logger.info(`Got display ${event}`);
    })

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
  });
});

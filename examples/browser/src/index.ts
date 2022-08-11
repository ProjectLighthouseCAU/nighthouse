import * as nighthouse from "nighthouse-browser";
import { ConsoleLogHandler, LIGHTHOUSE_WINDOWS } from "nighthouse-common";

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
      logHandler: new ConsoleLogHandler(),
    });

    console.log('Connecting...');
    await lh.ready();
    console.log('Connected!');

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

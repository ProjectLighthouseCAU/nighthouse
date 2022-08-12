import * as nighthouse from "nighthouse-browser";
import { ConsoleLogHandler, LIGHTHOUSE_HEIGHT, LIGHTHOUSE_WIDTH, LIGHTHOUSE_WINDOWS, Logger } from "nighthouse-browser";

import '../styles.css';

const logger = new Logger(new ConsoleLogHandler());
let display = new Uint8Array(3 * LIGHTHOUSE_WINDOWS);

function renderLighthouseView(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const windowWidth = Math.round(canvas.width / LIGHTHOUSE_WIDTH);
  const windowHeight = Math.round(canvas.height / (2 * LIGHTHOUSE_HEIGHT));

  for (let y = 0; y < LIGHTHOUSE_HEIGHT; y++) {
    for (let x = 0; x < LIGHTHOUSE_WIDTH; x++) {
      const i = 3 * (y * LIGHTHOUSE_WIDTH + x);
      const r = display[i];
      const g = display[i + 1];
      const b = display[i + 2];
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x * windowWidth, y * 2 * windowHeight, windowWidth, windowHeight);
    }
  }
}

function resizeLighthouseView(canvas: HTMLCanvasElement): void {
  const innerSize = Math.min(window.innerHeight, window.innerWidth);
  const newSize = Math.floor((0.9 * innerSize) / LIGHTHOUSE_HEIGHT) * LIGHTHOUSE_HEIGHT;
  if (Math.abs(canvas.height - newSize) > 10) {
    canvas.width = newSize;
    canvas.height = newSize;
    renderLighthouseView(canvas);
  }
}

window.addEventListener('load', () => {
  const urlField = document.getElementById('lighthouse-url') as HTMLInputElement;
  const usernameField = document.getElementById('lighthouse-username') as HTMLInputElement;
  const tokenField = document.getElementById('lighthouse-token') as HTMLInputElement;
  const connectButton = document.getElementById('lighthouse-connect') as HTMLButtonElement;
  const viewCanvas = document.getElementById('lighthouse-view') as HTMLCanvasElement;

  // Handle window sizing
  window.addEventListener('resize', () => {
    resizeLighthouseView(viewCanvas);
  });
  resizeLighthouseView(viewCanvas);

  // Set up lighthouse connection listener
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
      display = event;
      renderLighthouseView(viewCanvas);
    });

    // Add key listeners
    viewCanvas.tabIndex = 0;
    viewCanvas.addEventListener('keydown', event => {
      lh.sendInput({
        dwn: true,
        src: 0, // TODO: Provide a meaningful value
        key: event.keyCode,
      });
    });
    viewCanvas.addEventListener('keyup', event => {
      lh.sendInput({
        dwn: false,
        src: 0, // TODO: Provide a meaningful value
        key: event.keyCode,
      });
    });
    viewCanvas.addEventListener('resize', () => {
      renderLighthouseView(viewCanvas);
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
  });
});

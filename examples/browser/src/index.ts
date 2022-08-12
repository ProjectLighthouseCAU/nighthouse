import * as nighthouse from "nighthouse-browser";
import { Auth, Connection, ConsoleLogHandler, LIGHTHOUSE_HEIGHT, LIGHTHOUSE_WIDTH, LIGHTHOUSE_WINDOWS, Logger } from "nighthouse-browser";

import '../styles.css';

const logger = new Logger(new ConsoleLogHandler());

let lh: Connection | undefined;
let display = new Uint8Array(3 * LIGHTHOUSE_WINDOWS);

function renderLighthouseView(view: HTMLCanvasElement): void {
  const ctx = view.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, view.width, view.height);

  const windowWidth = Math.round(view.width / LIGHTHOUSE_WIDTH);
  const windowHeight = Math.round(view.height / (2 * LIGHTHOUSE_HEIGHT));

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

function resizeLighthouseView(view: HTMLCanvasElement): void {
  const innerSize = Math.min(window.innerHeight, window.innerWidth);
  const newSize = Math.floor((0.9 * innerSize) / LIGHTHOUSE_HEIGHT) * LIGHTHOUSE_HEIGHT;
  if (Math.abs(view.height - newSize) > 10) {
    view.width = newSize;
    view.height = newSize;
    renderLighthouseView(view);
  }
}

async function connectToLighthouse(url: string, auth: Auth, view: HTMLCanvasElement): Promise<void> {
  // Disconnect if already connected
  if (lh !== undefined) {
    await lh.close();
  }

  // Connect to lighthouse
  lh = nighthouse.connect({
    url,
    auth,
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
    renderLighthouseView(view);
  });

  // Add key listeners
  view.tabIndex = 0;
  view.addEventListener('keydown', event => {
    lh.sendInput({
      dwn: true,
      src: 0, // TODO: Provide a meaningful value
      key: event.keyCode,
    });
  });
  view.addEventListener('keyup', event => {
    lh.sendInput({
      dwn: false,
      src: 0, // TODO: Provide a meaningful value
      key: event.keyCode,
    });
  });
  view.addEventListener('resize', () => {
    renderLighthouseView(view);
  });

  // Request stream for user's model
  await lh.requestStream();
}

window.addEventListener('load', () => {
  const urlField = document.getElementById('lighthouse-url') as HTMLInputElement;
  const userField = document.getElementById('lighthouse-user') as HTMLInputElement;
  const tokenField = document.getElementById('lighthouse-token') as HTMLInputElement;
  const connectButton = document.getElementById('lighthouse-connect') as HTMLButtonElement;
  const view = document.getElementById('lighthouse-view') as HTMLCanvasElement;

  // Handle window sizing
  window.addEventListener('resize', () => {
    resizeLighthouseView(view);
  });
  resizeLighthouseView(view);

  // Set up lighthouse connection listener
  connectButton.addEventListener('click', async () => {
    const auth: Auth = { USER: userField.value, TOKEN: tokenField.value };
    connectToLighthouse(urlField.value, auth, view);
  });
});

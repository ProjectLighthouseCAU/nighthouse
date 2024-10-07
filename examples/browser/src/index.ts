import * as nighthouse from "nighthouse/browser";
import { Auth, Lighthouse, ConsoleLogHandler, LighthouseClosedError, LIGHTHOUSE_ROWS, LIGHTHOUSE_COLS, LIGHTHOUSE_FRAME_BYTES, LIGHTHOUSE_COLOR_CHANNELS, Logger, LeveledLogHandler, LogLevel } from "nighthouse/browser";

import '../styles.css';

const logger = new Logger(new LeveledLogHandler(LogLevel.Debug, new ConsoleLogHandler()));

let lh: Lighthouse | undefined;
let frame = new Uint8Array(LIGHTHOUSE_FRAME_BYTES);

function renderLighthouseView(view: HTMLCanvasElement): void {
  const ctx = view.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, view.width, view.height);

  const windowWidth = Math.round(view.width / LIGHTHOUSE_COLS);
  const windowHeight = Math.round(view.height / (2 * LIGHTHOUSE_ROWS));

  for (let y = 0; y < LIGHTHOUSE_ROWS; y++) {
    for (let x = 0; x < LIGHTHOUSE_COLS; x++) {
      const i = LIGHTHOUSE_COLOR_CHANNELS * (y * LIGHTHOUSE_COLS + x);
      const rgb = frame.slice(i, i + LIGHTHOUSE_COLOR_CHANNELS);
      ctx.fillStyle = `rgb(${rgb.join(',')})`;
      ctx.fillRect(x * windowWidth, y * 2 * windowHeight, windowWidth, windowHeight);
    }
  }
}

function resizeLighthouseView(view: HTMLCanvasElement): void {
  const innerSize = Math.min(window.innerHeight, window.innerWidth);
  const newSize = Math.floor((0.9 * innerSize) / LIGHTHOUSE_ROWS) * LIGHTHOUSE_ROWS;
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
  const stream = lh.streamModel();
  (async () => {
    try {
      for await (const event of stream) {
        const payload = event.PAYL;
        if (payload instanceof Uint8Array) {
          frame = payload;
          renderLighthouseView(view);
        } else {
          logger.info(`Got event ${JSON.stringify(payload)}`);
        }
      }
    } catch (error) {
      if (error instanceof LighthouseClosedError) {
        logger.info(`Stream closed`);
      } else {
        logger.error(`Stream errored: ${error}`);
      }
    }
  })();

  // Add key listeners
  view.tabIndex = 0;
  view.addEventListener('keydown', event => {
    lh.putModel({
      dwn: true,
      src: 0, // TODO: Provide a meaningful value
      key: event.keyCode,
    });
  });
  view.addEventListener('keyup', event => {
    lh.putModel({
      dwn: false,
      src: 0, // TODO: Provide a meaningful value
      key: event.keyCode,
    });
  });
  view.addEventListener('resize', () => {
    renderLighthouseView(view);
  });
}

window.addEventListener('load', () => {
  const connectForm = document.getElementById('lighthouse-connect-form') as HTMLFormElement;
  const urlField = document.getElementById('lighthouse-url') as HTMLInputElement;
  const userField = document.getElementById('lighthouse-user') as HTMLInputElement;
  const tokenField = document.getElementById('lighthouse-token') as HTMLInputElement;
  const view = document.getElementById('lighthouse-view') as HTMLCanvasElement;

  // Handle window sizing
  window.addEventListener('resize', () => {
    resizeLighthouseView(view);
  });
  resizeLighthouseView(view);

  // Set up lighthouse connection listener
  connectForm.addEventListener('submit', async e => {
    e.preventDefault();
    const auth: Auth = { USER: userField.value, TOKEN: tokenField.value };
    connectToLighthouse(urlField.value, auth, view);
  });
});

import { expect, test } from '@jest/globals';
import { MessagePackCoder } from '../common/coder';
import { Lighthouse } from '../common/lighthouse';
import { ConsoleLogHandler, Logger } from '../common/log';
import { Auth, ClientMessage, ServerMessage } from '../common/protocol';
import { TestTransport } from "./transport";
import { isEqual } from "./utils";
import { LighthouseResponseError } from '../common/error';

function createLighthouse(responder: (msg: ClientMessage<unknown>) => Iterable<ServerMessage<any>>) {
  const auth: Auth = { USER: 'test', TOKEN: 'test' };
  const coder = new MessagePackCoder();
  const logger = new Logger(new ConsoleLogHandler());
  const transport = new TestTransport(coder, responder);
  return new Lighthouse(auth, transport, logger);
}

test('getting resource', async () => {
  const lh = createLighthouse(function* (msg) {
    if (isEqual(msg.PATH, ['hello'])) {
      yield {
        REID: msg.REID,
        RNUM: 200,
        PAYL: 'Hello world!',
      };
    } else {
      yield {
        REID: msg.REID,
        RNUM: 400,
        PAYL: {},
      }
    }
  });

  expect((await lh.get(['hello'])).PAYL).toBe('Hello world!');

  try {
    await lh.get(['something', 'else']);
    throw new Error('Should not resolve');
  } catch (error) {
    expect(error).toBeInstanceOf(LighthouseResponseError);
  }
});

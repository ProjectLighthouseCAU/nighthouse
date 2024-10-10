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
    if (msg.VERB === 'GET' && isEqual(msg.PATH, ['hello'])) {
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

test('streaming', async () => {
  const lh = createLighthouse(function* (msg) {
    if (msg.VERB === 'STREAM' && isEqual(msg.PATH, ['user', 'test', 'model'])) {
      for (let i = 0; i < 4; i++) {
        yield {
          REID: msg.REID,
          RNUM: 200,
          PAYL: `Message ${i}`,
        };
      }
    } else {
      yield {
        REID: msg.REID,
        RNUM: 400,
        PAYL: {},
      }
    }
  });

  const payloads: unknown[] = [];
  for await (const response of lh.streamModel('test')) {
    payloads.push(response.PAYL);
    if (payloads.length >= 4) {
      break;
    }
  }
  expect(payloads).toStrictEqual(['Message 0', 'Message 1', 'Message 2', 'Message 3']);
});

import { expect, test } from '@jest/globals';
import { MessagePackCoder } from '../common/coder';
import { Lighthouse } from '../common/lighthouse';
import { ConsoleLogHandler, Logger } from '../common/log';
import { Auth, ClientMessage, ServerMessage } from '../common/protocol';
import { TestTransport } from "./transport";
import { collectAsyncIterable, isEqual } from "./utils";
import { LighthouseResponseError } from '../common/error';

function createLighthouse(responder: (msg: ClientMessage<unknown>) => Iterable<ServerMessage<any>>) {
  const auth: Auth = { USER: 'test', TOKEN: 'test' };
  const coder = new MessagePackCoder();
  const logger = new Logger(new ConsoleLogHandler());
  const transport = new TestTransport(coder, responder);
  return new Lighthouse(auth, transport, logger);
}

function okResponse<T>(id: number, payload: T): ServerMessage<T> {
  return { REID: id, RNUM: 200, PAYL: payload };
}

function errorResponse(id: number): ServerMessage<unknown> {
  return { REID: id, RNUM: 400, PAYL: {} };
}

test('getting resource', async () => {
  const lh = createLighthouse(function* (msg) {
    if (msg.VERB === 'GET' && isEqual(msg.PATH, ['hello'])) {
      yield okResponse(msg.REID, 'Hello world!');
    } else {
      yield errorResponse(msg.REID);
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

test('streaming user model', async () => {
  const lh = createLighthouse(function* (msg) {
    if (msg.VERB === 'STREAM' && isEqual(msg.PATH, ['user', 'test', 'model'])) {
      for (let i = 0; i < 4; i++) {
        yield okResponse(msg.REID, `Message ${i}`);
      }
    } else {
      yield errorResponse(msg.REID);
    }
  });

  const payloads = (await collectAsyncIterable(lh.streamModel('test'), 4)).map(msg => msg.PAYL);
  expect(payloads).toStrictEqual(['Message 0', 'Message 1', 'Message 2', 'Message 3']);
});

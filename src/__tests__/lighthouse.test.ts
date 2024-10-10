import assert from "node:assert";
import test from "node:test";
import { MessagePackCoder } from '../common/coder';
import { Lighthouse } from '../common/lighthouse';
import { ConsoleLogHandler, Logger } from '../common/log';
import { Auth, ClientMessage, ServerMessage } from '../common/protocol';
import { TestTransport } from "./transport";
import { isEqual } from "./utils";

function createLighthouse(responder: (msg: ClientMessage<unknown>) => ServerMessage<any>) {
  const auth: Auth = { USER: 'test', TOKEN: 'test' };
  const coder = new MessagePackCoder();
  const logger = new Logger(new ConsoleLogHandler());
  const transport = new TestTransport(coder, responder);
  return new Lighthouse(auth, transport, logger);
}

await test('1 + 1', async () => {
  const lh = createLighthouse(msg => {
    if (isEqual(msg.PATH, ['hello'])) {
      return {
        REID: msg.REID,
        RNUM: 200,
        PAYL: 'Hello world!',
      };
    } else {
      return {
        REID: msg.REID,
        RNUM: 400,
        PAYL: {},
      }
    }
  });
  assert.strictEqual(await lh.get(['hello']), 'Hello world!');
  assert.throws(async () => await lh.get(['something', 'else']));
});

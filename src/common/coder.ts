import * as msgpack from '@msgpack/msgpack';

/**
 * A pair of encoder and decoder for serializing and deserializing values.
 * Usually a MessagePack implementation.
 */
export interface Coder {
  /** Encodes a message to bytes. */
  encode(message: any): Uint8Array;

  /** Decodes a message from bytes. */
  decode(raw: Uint8Array): any;
}

export class MessagePackCoder implements Coder {
  encode(message: any): Uint8Array {
    return msgpack.encode(message);
  }

  decode(raw: Uint8Array): any {
    return msgpack.decode(raw);
  }
}

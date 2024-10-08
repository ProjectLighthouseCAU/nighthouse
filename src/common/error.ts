import { ServerMessage } from "./protocol";

export class LighthouseClosedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class LighthouseResponseError extends Error {
  constructor(readonly requestId: number, readonly response: ServerMessage<unknown>) {
    super(`Got ${response.RNUM} for response to id ${requestId}: ${JSON.stringify(response)}`);
  }
}

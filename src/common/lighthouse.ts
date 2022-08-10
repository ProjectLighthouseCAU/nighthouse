import { Transport } from "./transport";

/** A connection to the lighthouse. */
export class Lighthouse {
  constructor(private readonly transport: Transport) {
  }
}

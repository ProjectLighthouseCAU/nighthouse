import { Auth } from "./auth";
import { Verb } from "./verb";

/** A message sent from the client. */
export interface ClientMessage<P> {
  REID: any;
  AUTH: Auth;
  VERB: Verb;
  PATH: string[];
  META: any;
  PAYL: P;
}

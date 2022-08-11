/** A verb used for a request. */
export type Verb = 'POST' | 'CREATE' | 'MKDIR' | 'DELETE' | 'LIST' | 'GET' | 'PUT' | 'STREAM' | 'STOP' | 'LINK' | 'UNLINK';

/** Authentication credentials. */
export interface Auth {
  USER: string;
  TOKEN: string;
}

/** A message sent from the client. */
export interface ClientMessage<P> {
  REID: any;
  AUTH: Auth;
  VERB: Verb;
  PATH: string[];
  META: any;
  PAYL: P;
}

/** A message sent from the server. */
export interface ServerMessage<P> {
  RNUM: number;
  REID?: any;
  RESPONSE?: string;
  WARNINGS?: string[];
  PAYL: P;
}

/** A user-defined type guard for ServerMessage. */
export function isServerMessage(value: any): value is ServerMessage<unknown> {
  return 'RNUM' in value && 'PAYL' in value;
}

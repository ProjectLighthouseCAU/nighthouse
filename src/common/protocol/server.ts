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
  return typeof value === 'object' && 'RNUM' in value && 'PAYL' in value;
}

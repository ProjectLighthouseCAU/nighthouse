/** A single (one-off) request verb. */
export type SingleVerb = 'POST' | 'CREATE' | 'MKDIR' | 'DELETE' | 'LIST' | 'GET' | 'PUT' | 'STOP' | 'LINK' | 'UNLINK';

/** A request verb. */
export type Verb = SingleVerb | 'STREAM';

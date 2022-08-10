import { Transport } from "../common";

export class BrowserTransport implements Transport {
  async send<T>(message: T): Promise<void> {
    // TODO
  }

  onReceive<T>(handler: (message: T) => void): void {
    
  }
}

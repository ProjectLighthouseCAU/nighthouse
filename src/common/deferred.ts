export class Deferred<T> {
  readonly promise: Promise<T>;

  private _resolve: (value: T) => void;
  private _reject: (reason?: any) => void;
  private isCompleted = false;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this._resolve = value => resolve(value);
      this._reject = reason => reject(reason);
    });
  }

  resolve(value: T): void {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this._resolve(value);
  }

  reject(reason?: any): void {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this._reject(reason);
  }
}

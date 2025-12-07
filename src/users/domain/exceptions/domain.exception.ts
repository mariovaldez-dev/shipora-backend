export class DomainException extends Error {
  public name = 'DomainException';
  constructor(
    public readonly message: string,
    public readonly meta?: any,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

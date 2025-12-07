// src/modules/users/domain/value-objects/password.vo.ts
import * as bcrypt from 'bcrypt';

export class Password {
  private constructor(private readonly hashed: string) {}

  // crea desde texto plano (hashea)
  static async create(plain: string) {
    if (!plain || typeof plain !== 'string' || plain.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const hashed = await bcrypt.hash(plain, 10);
    return new Password(hashed);
  }

  // crea VO desde un hash ya existente (cuando lees de DB)
  static fromHash(hash: string) {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Invalid hash');
    }
    return new Password(hash);
  }

  get value(): string {
    return this.hashed;
  }

  async compare(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.hashed);
  }
}

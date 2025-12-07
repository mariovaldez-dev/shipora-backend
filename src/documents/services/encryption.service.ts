import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptedData {
  iv: string;
  authTag: string;
  ciphertext: string;
}

@Injectable()
export class EncryptionService {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error(
        'ENCRYPTION_KEY must be set in environment variables (32 bytes in hex)',
      );
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');

    if (this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (256 bits)');
    }
  }

  /**
   * Encrypts a buffer using AES-256-GCM
   * @param data Buffer to encrypt
   * @returns Encrypted data with IV, auth tag, and ciphertext
   */
  encrypt(data: Buffer): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    ) as crypto.CipherGCM;

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Validate authTag
    if (authTag.length !== 16) {
      throw new Error(
        `Invalid authTag length: ${authTag.length}, expected 16 bytes`,
      );
    }

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: encrypted.toString('hex'),
    };
  }

  /**
   * Decrypts an EncryptedData object back to the original buffer
   * @param data Encrypted data object
   * @returns Decrypted buffer
   * @throws Error if decryption fails (tampered data)
   */
  decrypt(data: EncryptedData): Buffer {
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    const ciphertext = Buffer.from(data.ciphertext, 'hex');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Decryption failed: ${message}. Data may have been tampered with.`,
      );
    }
  }

  /**
   * Generates a secure encryption key (call this to generate ENCRYPTION_KEY)
   * @returns 32-byte encryption key in hex format
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

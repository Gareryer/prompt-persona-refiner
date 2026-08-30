/**
 * Web Crypto API AES-GCM Encryptor for API Keys
 */
export class CryptoService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;

  private static async getDerivedKey(salt: Uint8Array): Promise<CryptoKey> {
    const rawKey = new TextEncoder().encode('prompt-persona-refiner-v4-master-salt');
    const keyMaterial = await crypto.subtle.importKey('raw', rawKey, { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) return '';
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.getDerivedKey(salt);

    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      encoded
    );

    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedBase64: string): Promise<string> {
    if (!encryptedBase64) return '';
    try {
      const binary = atob(encryptedBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const salt = bytes.slice(0, 16);
      const iv = bytes.slice(16, 28);
      const data = bytes.slice(28);

      const key = await this.getDerivedKey(salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv.buffer as ArrayBuffer },
        key,
        data.buffer as ArrayBuffer
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return encryptedBase64; // Fallback if plain
    }
  }
}

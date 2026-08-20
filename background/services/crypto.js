/**
 * @fileoverview Cryptographic Utilities for API Key Encryption/Decryption
 * @module background/services/crypto
 */

export async function getEncryptionKey() {
  const extensionId = chrome.runtime.id;
  const salt = new TextEncoder().encode('prompt-assistant-api-key-salt-v1');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(extensionId),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function decryptApiKey(encryptedData) {
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

export function isEncrypted(value) {
  return value && /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 50;
}

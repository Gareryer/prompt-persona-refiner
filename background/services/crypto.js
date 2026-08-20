let cachedKey = null;

export async function getEncryptionKey() {
  if (cachedKey) return cachedKey;

  const extensionId = chrome.runtime.id;
  const salt = new TextEncoder().encode('prompt-assistant-api-key-salt-v1');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(extensionId),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  cachedKey = await crypto.subtle.deriveKey(
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

  return cachedKey;
}

export async function encryptApiKey(plaintext) {
  if (!plaintext) return '';
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    const base64 = btoa(String.fromCharCode(...combined));
    return 'enc:v1:' + base64;
  } catch (error) {
    console.error('Encryption error:', error);
    return plaintext;
  }
}

export async function decryptApiKey(encryptedData) {
  if (!encryptedData) return '';
  if (!isEncrypted(encryptedData)) {
    return encryptedData; // Already plaintext
  }

  try {
    const rawBase64 = encryptedData.replace(/^enc:v1:/, '');
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));

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
  return typeof value === 'string' && value.startsWith('enc:v1:');
}

/**
 * Runtime Security Manager
 * 
 * Generates ephemeral cryptographic keys at runtime that exist ONLY in RAM.
 * Keys are never written to storage, localStorage, or embedded in code.
 * 
 * Security features:
 * - Session-unique keys (regenerated on each page load)
 * - Closure-protected (not accessible via global scope)
 * - Anti-tampering checks
 * - Domain validation
 */

(function () {
    'use strict';

    // === DOMAIN LOCK ===
    const currentDomain = window.location.hostname;
    const isAllowedDomain = currentDomain === 'gemini.google.com' || currentDomain.endsWith('.gemini.google.com');

    if (!isAllowedDomain) {
        console.error('[Security] Unauthorized domain:', currentDomain);
        window.__GEMINI_EXT_DISABLED__ = true;
        return;
    }

    // === EPHEMERAL SESSION KEY GENERATION ===
    // Keys exist ONLY in RAM within this closure
    const _keyStore = (function () {
        const generateKey = (length = 32) => {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        };

        const _sessionKey = generateKey(32);
        const _instanceKey = generateKey(16);
        const _fingerprint = generateKey(8);
        const _timestamp = Date.now();

        // Derive a combined key using non-commutative polynomial rolling hash (djb2)
        const deriveKey = (purpose) => {
            let hash = 5381;
            for (let i = 0; i < purpose.length; i++) {
                hash = ((hash << 5) + hash) + purpose.charCodeAt(i);
                hash = hash & 0xffffffff;
            }
            const purposeHash = (hash >>> 0).toString(16).padStart(8, '0');
            return _sessionKey.slice(0, 16) + purposeHash + _instanceKey.slice(0, 8);
        };

        return {
            // Public API (still protected by closure)
            getSessionId: () => _sessionKey.slice(0, 8) + '-' + _fingerprint,
            deriveKey: deriveKey,
            getTimestamp: () => _timestamp,
            validate: () => {
                // Check if keys are intact
                return _sessionKey.length === 64 &&
                    _instanceKey.length === 32 &&
                    _fingerprint.length === 16 &&
                    _timestamp > 0;
            }
        };
    })();

    // === INTEGRITY CHECK ===
    const _integrityCheck = (function () {
        const protectedTargets = [
            { name: 'window.fetch', target: window, prop: 'fetch', original: window.fetch },
            { name: 'window.XMLHttpRequest', target: window, prop: 'XMLHttpRequest', original: window.XMLHttpRequest },
            { name: 'console.log', target: console, prop: 'log', original: console.log },
            { name: 'console.warn', target: console, prop: 'warn', original: console.warn },
            { name: 'console.error', target: console, prop: 'error', original: console.error }
        ].filter(item => item.target && typeof item.target[item.prop] === 'function');

        return {
            verify: () => {
                for (const item of protectedTargets) {
                    if (item.target[item.prop] !== item.original) {
                        console.warn('[Security] Integrity check failed:', item.name);
                        return false;
                    }
                }
                return true;
            }
        };
    })();

    // === PUBLIC API ===
    // Exposed via a frozen object that can't be modified
    const SecurityManager = Object.freeze({
        // Get session identifier (safe to expose)
        getSessionId: () => _keyStore.getSessionId(),

        // Derive a purpose-specific key (for internal use)
        deriveKey: (purpose) => {
            if (!purpose || typeof purpose !== 'string') {
                throw new Error('Purpose required');
            }
            return _keyStore.deriveKey(purpose);
        },

        // Validate extension integrity
        validate: () => {
            return _keyStore.validate() &&
                _integrityCheck.verify() &&
                !window.__GEMINI_EXT_DISABLED__;
        },

        // Check if running in authorized context
        isAuthorized: () => !window.__GEMINI_EXT_DISABLED__,

        // Encrypt with derived key using AES-GCM (256-bit)
        encrypt: async (text, purpose = 'default') => {
            if (typeof text !== 'string') return '';
            try {
                const keyStr = _keyStore.deriveKey(purpose);
                const enc = new TextEncoder();
                const keyHash = await crypto.subtle.digest('SHA-256', enc.encode(keyStr));
                const cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    keyHash,
                    { name: 'AES-GCM' },
                    false,
                    ['encrypt']
                );
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const cipher = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    cryptoKey,
                    enc.encode(text)
                );
                const combined = new Uint8Array(iv.length + cipher.byteLength);
                combined.set(iv, 0);
                combined.set(new Uint8Array(cipher), iv.length);
                return btoa(String.fromCharCode(...combined));
            } catch (err) {
                console.error('[Security] Encryption failed:', err);
                return '';
            }
        },

        // Decrypt with derived key using AES-GCM (256-bit)
        decrypt: async (encryptedBase64, purpose = 'default') => {
            if (typeof encryptedBase64 !== 'string') return '';
            try {
                const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
                if (combined.length < 13) return '';
                const iv = combined.slice(0, 12);
                const cipher = combined.slice(12);
                const keyStr = _keyStore.deriveKey(purpose);
                const enc = new TextEncoder();
                const keyHash = await crypto.subtle.digest('SHA-256', enc.encode(keyStr));
                const cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    keyHash,
                    { name: 'AES-GCM' },
                    false,
                    ['decrypt']
                );
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv },
                    cryptoKey,
                    cipher
                );
                return new TextDecoder().decode(decrypted);
            } catch (err) {
                console.error('[Security] Decryption failed:', err);
                return null;
            }
        }
    });

    // Expose to extension (but not easily discoverable)
    Object.defineProperty(window, '__GEMINI_SEC__', {
        value: SecurityManager,
        writable: false,
        configurable: false,
        enumerable: false // Not visible in Object.keys(window)
    });

    // Log session start (remove in production if desired)
    console.log('[Security] Session initialized:', SecurityManager.getSessionId());

})();

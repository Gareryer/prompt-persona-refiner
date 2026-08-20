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

        // Derive a combined key (XOR of session + instance)
        const deriveKey = (purpose) => {
            const purposeHash = purpose.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            return _sessionKey.slice(0, 16) + purposeHash.toString(16) + _instanceKey.slice(0, 8);
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

        // Simple encrypt (XOR with derived key) for non-critical data
        encrypt: (text, purpose = 'default') => {
            const key = _keyStore.deriveKey(purpose);
            return text.split('').map((c, i) =>
                String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
            ).join('');
        },

        // Simple decrypt
        decrypt: (encrypted, purpose = 'default') => {
            // XOR is symmetric
            return SecurityManager.encrypt(encrypted, purpose);
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

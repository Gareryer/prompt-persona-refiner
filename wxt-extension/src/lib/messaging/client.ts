import type { ProtocolMap, MessageType } from './protocol';

/**
 * Type-safe message sender for content scripts and UI panels.
 */
export async function sendRpcMessage<K extends MessageType>(
  type: K,
  payload?: ProtocolMap[K]['request']
): Promise<ProtocolMap[K]['response']> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve({ success: false, error: 'Extension runtime unavailable' } as any);
      return;
    }

    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message } as any);
      } else {
        resolve(response);
      }
    });
  });
}

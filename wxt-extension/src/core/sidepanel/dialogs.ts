/**
 * @fileoverview Sidepanel Dialog and Notification Components
 * Ported from sidepanel/sidepanel.js (Dialogs & Dropdown sections)
 * @module sidepanel/dialogs
 */

export interface DialogOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm?: (val?: string) => void;
  onCancel?: () => void;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.className = `allie-notification allie-notification-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function showAlertDialog(options: DialogOptions): void {
  if (typeof document === 'undefined') return;
  const dialog = document.createElement('div');
  dialog.className = 'allie-alert-dialog';
  const cleanup = () => dialog.remove();
  const handleDismiss = () => { cleanup(); options.onDismiss?.(); };
  const handleRetry = () => { cleanup(); options.onRetry?.(); };
  const handleScrimClick = (e: MouseEvent) => { if (e.target === dialog) handleDismiss(); };
  const handleKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss(); };

  dialog.addEventListener('click', handleScrimClick);
  window.addEventListener('keydown', handleKeydown, { once: true });
  document.body.appendChild(dialog);
}

export function showConfirmDialog(options: DialogOptions): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof document === 'undefined') return resolve(false);
    const dialog = document.createElement('div');
    dialog.className = 'allie-confirm-dialog';
    const cleanup = () => dialog.remove();
    const handleConfirm = () => { cleanup(); options.onConfirm?.(); resolve(true); };
    const handleCancel = () => { cleanup(); options.onCancel?.(); resolve(false); };
    const handleScrimClick = (e: MouseEvent) => { if (e.target === dialog) handleCancel(); };
    const handleKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };

    dialog.addEventListener('click', handleScrimClick);
    window.addEventListener('keydown', handleKeydown, { once: true });
    document.body.appendChild(dialog);
  });
}

export function showPromptDialog(options: DialogOptions): Promise<string | null> {
  return new Promise(resolve => {
    if (typeof document === 'undefined') return resolve(null);
    const dialog = document.createElement('div');
    dialog.className = 'allie-prompt-dialog';
    const cleanup = () => dialog.remove();
    const handleConfirm = (val: string) => { cleanup(); options.onConfirm?.(val); resolve(val); };
    const handleCancel = () => { cleanup(); options.onCancel?.(); resolve(null); };
    const handleScrimClick = (e: MouseEvent) => { if (e.target === dialog) handleCancel(); };
    const handleKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };

    dialog.addEventListener('click', handleScrimClick);
    window.addEventListener('keydown', handleKeydown, { once: true });
    document.body.appendChild(dialog);
  });
}

export function setupM3Dropdown(dropdownEl: HTMLElement): { toggleDropdown: () => void; selectItem: (val: string) => void } {
  const toggleDropdown = () => dropdownEl.classList.toggle('open');
  const selectItem = (val: string) => {
    dropdownEl.dataset.value = val;
    dropdownEl.classList.remove('open');
  };
  return { toggleDropdown, selectItem };
}
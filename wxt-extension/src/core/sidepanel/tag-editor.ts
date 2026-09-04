/**
 * @fileoverview Sidepanel Tag and Chip Editing System
 * Ported from sidepanel/sidepanel.js (Tags & Chips sections)
 * @module sidepanel/tag-editor
 */

export function getChipGroupValue(container: HTMLElement | null): string[] {
  if (!container) return [];
  const selected = container.querySelectorAll<HTMLElement>('.chip.selected, [data-selected="true"]');
  return Array.from(selected).map(c => c.dataset.value || c.textContent?.trim() || '');
}

export function getSelectedChipValue(group: HTMLElement | null): string | null {
  if (!group) return null;
  const active = group.querySelector<HTMLElement>('.chip.selected, [data-selected="true"]');
  return active?.dataset.value || active?.textContent?.trim() || null;
}

export function setChipSelection(group: HTMLElement | null, val: string): void {
  if (!group) return;
  group.querySelectorAll<HTMLElement>('.chip').forEach(c => {
    const isSelected = (c.dataset.value === val || c.textContent?.trim() === val);
    c.classList.toggle('selected', isSelected);
    c.dataset.selected = isSelected ? 'true' : 'false';
  });
}

export function getTagValues(container: HTMLElement | null): string[] {
  if (!container) return [];
  const tags = container.querySelectorAll<HTMLElement>('.tag, .tag-label');
  return Array.from(tags).map(t => t.textContent?.trim() || '').filter(Boolean);
}

export function handleRemoveTag(tag: string, list: string[]): string[] {
  return list.filter(t => t !== tag);
}

export function handleEditTag(oldTag: string, newTag: string, list: string[]): string[] {
  if (!newTag.trim()) return handleRemoveTag(oldTag, list);
  return list.map(t => t === oldTag ? newTag.trim() : t);
}

export function handleAddTag(newTag: string, list: string[]): string[] {
  const trimmed = newTag.trim();
  if (!trimmed || list.includes(trimmed)) return list;
  return [...list, trimmed];
}

export function createEditableTag(
  tag: string,
  onRemove?: (tag: string) => void,
  onEdit?: (oldTag: string, newTag: string) => void
): HTMLElement {
  const tagEl = document.createElement('span');
  tagEl.className = 'editable-tag tag';
  tagEl.textContent = tag;
  if (onRemove) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-tag-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => onRemove(tag);
    tagEl.appendChild(removeBtn);
  }
  return tagEl;
}

export function createEditableTagList(tags: string[], onUpdate: (tags: string[]) => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'editable-tag-list';
  tags.forEach(t => {
    container.appendChild(createEditableTag(t, (removed) => {
      onUpdate(handleRemoveTag(removed, tags));
    }));
  });
  return container;
}

export function createContextEditableTag(tag: string, onRemove?: (tag: string) => void): HTMLElement {
  return createEditableTag(tag, onRemove);
}

export function createContextEditableTagList(tags: string[], onUpdate: (tags: string[]) => void): HTMLElement {
  return createEditableTagList(tags, onUpdate);
}

export function handleAddContextTag(tag: string, current: string[] = []): string[] {
  return handleAddTag(tag, current);
}

export function handleRemoveContextTag(tag: string, current: string[] = []): string[] {
  return handleRemoveTag(tag, current);
}

export function updateContextTagsInData(tags: string[], data: any = {}): any {
  return { ...data, scope_tags: tags };
}

export function updateTagsInStorage(dimension: string, tags: string[]): void {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ [`tags_${dimension}`]: tags });
  }
}

export function setupContextInlineEditing(): void {
  // Inline editing lifecycle hook
}

export function updateContextFieldInData(field: string, value: any, data: any = {}): any {
  return { ...data, [field]: value };
}

export function createSingleSelectChips(
  options: string[],
  selected: string,
  onSelect: (val: string) => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chip-group single-select';
  options.forEach(opt => {
    const chip = document.createElement('button');
    chip.className = `chip ${opt === selected ? 'selected' : ''}`;
    chip.dataset.value = opt;
    chip.textContent = opt;
    chip.onclick = () => onSelect(opt);
    container.appendChild(chip);
  });
  return container;
}

export function createMultiSelectChips(
  options: string[],
  selected: string[],
  onToggle: (val: string) => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chip-group multi-select';
  options.forEach(opt => {
    const chip = document.createElement('button');
    chip.className = `chip ${selected.includes(opt) ? 'selected' : ''}`;
    chip.dataset.value = opt;
    chip.textContent = opt;
    chip.onclick = () => onToggle(opt);
    container.appendChild(chip);
  });
  return container;
}

export function renderChips(container: HTMLElement, options: string[], selected: string | string[]): void {
  container.innerHTML = '';
  const selArray = Array.isArray(selected) ? selected : [selected];
  options.forEach(opt => {
    const chip = document.createElement('span');
    chip.className = `chip ${selArray.includes(opt) ? 'selected' : ''}`;
    chip.textContent = opt;
    container.appendChild(chip);
  });
}

export function handleAdd(inputEl: HTMLInputElement, list: string[]): string[] {
  const val = inputEl.value.trim();
  inputEl.value = '';
  return handleAddTag(val, list);
}

export function createTextInput(
  placeholder: string,
  value: string,
  onChange: (val: string) => void
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value;
  input.oninput = () => onChange(input.value);
  return input;
}

export function setupTagList(): void {
  // Tag list container init
}

export function saveTag(tag: string, list: string[] = []): string[] {
  return handleAddTag(tag, list);
}
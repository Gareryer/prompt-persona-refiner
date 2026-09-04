/**
 * @fileoverview Complete Version History & Diff Engine for Personas
 * Ported from sidepanel/sidepanel.js (L7004-L7280)
 * @module sidepanel/version-history
 */

import { logger } from '../logging/logger';
import { formatDiffValue, formatFieldLabel } from './import-export';

export interface VersionSnapshot {
  version: number;
  created_at: string;
  change_notes?: string;
  data: Record<string, any>;
}

export interface DiffEntry {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  status: 'changed' | 'added' | 'removed' | 'no_change';
}

/**
 * Load and format version history list for a persona (L7032-L7097)
 */
export function loadVersionHistory(persona: any): {
  currentVersion: number;
  versions: VersionSnapshot[];
  personaName: string;
} {
  const currentVersion = persona.version || 1;
  const history: VersionSnapshot[] = persona.version_history || [];
  const personaName = persona.name || persona.metadata?.suggested_name || 'Untitled Persona';

  logger.info('[VersionHistory] Loaded version history', {
    personaName,
    count: history.length + 1
  });

  return {
    currentVersion,
    versions: history,
    personaName
  };
}

/**
 * Pure diff algorithm comparing two persona snapshots (L7157-L7204)
 */
export function computePersonaDiff(current: any = {}, previous: any = {}): DiffEntry[] {
  if (!previous || Object.keys(previous).length === 0) {
    return [{
      field: 'initial',
      label: 'Initial Version',
      oldValue: '-',
      newValue: 'Created',
      status: 'added'
    }];
  }

  const entries: DiffEntry[] = [];
  const ignoredKeys = new Set(['id', 'author_id', 'created_at', 'updated_at', 'version', 'version_history']);

  function diffRecursive(curr: any, prev: any, prefix = '') {
    const allKeys = new Set([...Object.keys(curr || {}), ...Object.keys(prev || {})]);

    for (const key of allKeys) {
      if (ignoredKeys.has(key)) continue;

      const currVal = curr?.[key];
      const prevVal = prev?.[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        currVal && prevVal &&
        typeof currVal === 'object' && typeof prevVal === 'object' &&
        !Array.isArray(currVal) && !Array.isArray(prevVal)
      ) {
        diffRecursive(currVal, prevVal, fullKey);
        continue;
      }

      const currStr = formatDiffValue(currVal);
      const prevStr = formatDiffValue(prevVal);

      if (currStr !== prevStr) {
        entries.push({
          field: fullKey,
          label: formatFieldLabel(fullKey),
          oldValue: prevStr,
          newValue: currStr,
          status: 'changed'
        });
      }
    }
  }

  diffRecursive(current, previous);

  if (entries.length === 0) {
    return [{
      field: 'none',
      label: 'No Changes',
      oldValue: '-',
      newValue: '-',
      status: 'no_change'
    }];
  }

  return entries;
}

/**
 * Generate HTML string for diff view (legacy compatibility L7157)
 */
export function generateDiffView(current: any, previous: any): string {
  const diffs = computePersonaDiff(current, previous);
  if (diffs.length === 1 && diffs[0]?.status === 'no_change') {
    return '<div class="diff-line"><span class="diff-status no-change">No changes detected</span></div>';
  }

  return diffs.map(d => `
    <div class="diff-line changed">
      <span class="diff-field">${d.label}:</span>
      <span class="diff-old">${d.oldValue}</span>
      <span class="diff-arrow">→</span>
      <span class="diff-new">${d.newValue}</span>
      <span class="diff-status changed">${d.status.toUpperCase()}</span>
    </div>
  `).join('');
}

/**
 * Restore a previous version snapshot into current persona data (L7250-L7280)
 */
export function restoreVersion(currentPersona: any, snapshot: VersionSnapshot): {
  restoredPersona: any;
  newVersionNumber: number;
} {
  const nextVersion = (currentPersona?.version || 1) + 1;
  const snapshotData = snapshot.data || snapshot;

  const restored = {
    ...currentPersona,
    ...snapshotData,
    id: currentPersona?.id, // Preserve existing ID
    version: nextVersion,
    updated_at: new Date().toISOString()
  };

  logger.info('[VersionHistory] Restored version snapshot', {
    fromVersion: snapshot.version,
    newVersion: nextVersion
  });

  return {
    restoredPersona: restored,
    newVersionNumber: nextVersion
  };
}

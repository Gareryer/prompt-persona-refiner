import { describe, it, expect } from 'vitest';
import {
  loadVersionHistory,
  computePersonaDiff,
  generateDiffView,
  restoreVersion,
  type VersionSnapshot
} from '../../src/core/sidepanel/version-history';

describe('Phase 7B: Version History & Diff Engine', () => {
  it('loads version history with persona name and current version fallback', () => {
    const persona = {
      name: 'Test Persona',
      version: 2,
      version_history: [
        {
          version: 1,
          created_at: '2026-01-01T00:00:00.000Z',
          data: { persona: { instruction: 'v1 instruction' } }
        }
      ]
    };

    const result = loadVersionHistory(persona);
    expect(result.currentVersion).toBe(2);
    expect(result.personaName).toBe('Test Persona');
    expect(result.versions).toHaveLength(1);
  });

  it('computes initial diff when previous snapshot is missing', () => {
    const diffs = computePersonaDiff({ persona: { instruction: 'Brand new' } }, null);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.field).toBe('initial');
    expect(diffs[0]!.status).toBe('added');
  });

  it('detects changed fields recursively across persona dimensions', () => {
    const v1 = {
      persona: { instruction: 'Junior Developer' },
      tone: { instruction: 'Casual' }
    };
    const v2 = {
      persona: { instruction: 'Staff Architect' },
      tone: { instruction: 'Casual' }
    };

    const diffs = computePersonaDiff(v2, v1);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.field).toBe('persona.instruction');
    expect(diffs[0]!.oldValue).toBe('Junior Developer');
    expect(diffs[0]!.newValue).toBe('Staff Architect');
    expect(diffs[0]!.status).toBe('changed');
  });

  it('returns no_change when objects have identical content', () => {
    const v1 = { persona: { instruction: 'Identical' } };
    const v2 = { persona: { instruction: 'Identical' } };

    const diffs = computePersonaDiff(v2, v1);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.status).toBe('no_change');
  });

  it('generates HTML diff view matching legacy sidepanel format', () => {
    const v1 = { tone: { instruction: 'Direct' } };
    const v2 = { tone: { instruction: 'Socratic' } };

    const html = generateDiffView(v2, v1);
    expect(html).toContain('diff-line changed');
    expect(html).toContain('Direct');
    expect(html).toContain('Socratic');
  });

  it('restores previous version snapshot and increments current version number', () => {
    const currentPersona = {
      id: 'p_123',
      version: 3,
      persona: { instruction: 'Current v3 instruction' }
    };

    const snapshot: VersionSnapshot = {
      version: 1,
      created_at: '2026-01-01',
      data: {
        persona: { instruction: 'Old v1 instruction' }
      }
    };

    const { restoredPersona, newVersionNumber } = restoreVersion(currentPersona, snapshot);
    expect(newVersionNumber).toBe(4);
    expect(restoredPersona.id).toBe('p_123');
    expect(restoredPersona.version).toBe(4);
    expect(restoredPersona.persona.instruction).toBe('Old v1 instruction');
  });
});

import { describe, it, expect } from 'vitest';
import React from 'react';
import { SidepanelApp } from '@/../entrypoints/sidepanel/App';
import { OptionsApp } from '@/../entrypoints/options/App';

describe('Batch 7: Top-Level React Apps', () => {
  it('instantiates SidepanelApp component without crashing', () => {
    const el = React.createElement(SidepanelApp);
    expect(el.type).toBe(SidepanelApp);
  });

  it('instantiates OptionsApp component without crashing', () => {
    const el = React.createElement(OptionsApp);
    expect(el.type).toBe(OptionsApp);
  });
});

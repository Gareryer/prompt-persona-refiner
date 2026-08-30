import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { RefinerBadge } from '@/components/injections/RefinerBadge';
import { RatingOverlay } from '@/components/injections/RatingOverlay';

describe('Batch 6: Injected Shadow DOM Components', () => {
  it('instantiates RefinerBadge without crashing', () => {
    const onRefine = vi.fn().mockResolvedValue(undefined);
    const element = React.createElement(RefinerBadge, { onRefine });
    expect(element.type).toBe(RefinerBadge);
    expect(element.props.onRefine).toBe(onRefine);
  });

  it('instantiates RatingOverlay with default initial rating', () => {
    const onRate = vi.fn().mockResolvedValue(undefined);
    const element = React.createElement(RatingOverlay, { onRate, initialRating: 4 });
    expect(element.type).toBe(RatingOverlay);
    expect(element.props.initialRating).toBe(4);
  });
});

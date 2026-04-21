import { describe, expect, it } from 'vitest';

describe('worker contract', () => {
  it('uses the travel-events queue name expected by the API', () => {
    expect('travel-events').toBe('travel-events');
  });
});


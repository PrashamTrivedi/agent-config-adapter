import { describe, it, expect } from 'bun:test';
import { parseMultiSelect } from '../src/lib/display';

describe('parseMultiSelect', () => {
  it('parses comma-separated indices', () => {
    expect(parseMultiSelect('1,3,5', 5)).toEqual([1, 3, 5]);
  });

  it('parses space-separated indices', () => {
    expect(parseMultiSelect('2 4', 5)).toEqual([2, 4]);
  });

  it('parses ranges', () => {
    expect(parseMultiSelect('1-3', 5)).toEqual([1, 2, 3]);
  });

  it('handles reversed ranges', () => {
    expect(parseMultiSelect('3-1', 5)).toEqual([1, 2, 3]);
  });

  it('mixes ranges and singletons, de-duplicating and sorting', () => {
    expect(parseMultiSelect('5, 1-3, 2', 5)).toEqual([1, 2, 3, 5]);
  });

  it('expands "all" to every index', () => {
    expect(parseMultiSelect('all', 3)).toEqual([1, 2, 3]);
    expect(parseMultiSelect('*', 3)).toEqual([1, 2, 3]);
  });

  it('ignores out-of-range and invalid tokens', () => {
    expect(parseMultiSelect('0, 2, 9, abc', 5)).toEqual([2]);
  });

  it('returns empty array for empty input', () => {
    expect(parseMultiSelect('', 5)).toEqual([]);
    expect(parseMultiSelect('   ', 5)).toEqual([]);
  });
});

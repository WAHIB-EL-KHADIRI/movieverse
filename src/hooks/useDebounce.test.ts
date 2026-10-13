import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 300));
    expect(result.current).toBe('a');
  });

  it('only updates after the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } });
    rerender({ v: 'b' });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });

  it('restarts the timer on every change, emitting only the last value', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: '' } });
    for (const v of ['s', 'st', 'sta', 'star']) {
      rerender({ v });
      act(() => void vi.advanceTimersByTime(200));
    }
    expect(result.current).toBe('');
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe('star');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately on mount', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces value updates until the timer completes', () => {
    const { result, rerender } = renderHook(
      ({ val, delay }) => useDebounce(val, delay),
      {
        initialProps: { val: 'first', delay: 300 },
      }
    );

    expect(result.current).toBe('first');

    // Update value to 'second'
    rerender({ val: 'second', delay: 300 });

    // Halfway through delay: still 'first'
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('first');

    // Advance remaining time: now 'second'
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('second');
  });

  it('cancels pending timer when value updates before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useDebounce(val, 300),
      {
        initialProps: { val: 'alpha' },
      }
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Rapid change before 300ms finishes
    rerender({ val: 'beta' });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Only 200ms elapsed since 'beta', so current should still be 'alpha'
    expect(result.current).toBe('alpha');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('beta');
  });
});

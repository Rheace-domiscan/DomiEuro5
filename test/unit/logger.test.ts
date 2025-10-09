import { describe, it, expect, vi } from 'vitest';
import { logError } from '../../app/lib/logger';

describe('logError', () => {
  it('delegates to console.error with message and error payload', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const error = new Error('test failure');
    logError('Something went wrong', error);

    expect(spy).toHaveBeenCalled();
    const [prefix, message, payload] = spy.mock.calls[0];
    expect(typeof prefix).toBe('string');
    expect(message).toBe('Something went wrong');
    expect(payload).toEqual({ error });
    spy.mockRestore();
  });
});

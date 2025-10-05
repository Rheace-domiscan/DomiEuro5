import { describe, it, expect } from 'vitest';
import crons from '../../convex/crons';

describe('convex/crons configuration', () => {
  it('registers a daily check for grace periods', () => {
    const jobs = (
      crons as unknown as {
        crons: Record<
          string,
          {
            name: string;
            args: unknown[];
            schedule: { hourUTC: number; minuteUTC: number; type: string };
          }
        >;
      }
    ).crons;

    expect(Object.keys(jobs)).toContain('check grace periods');

    const job = jobs['check grace periods'];
    expect(job.name).toBe('subscriptions:checkGracePeriods');
    expect(job.schedule).toMatchObject({ hourUTC: 10, minuteUTC: 0, type: 'daily' });
    expect(Array.isArray(job.args)).toBe(true);
  });
});

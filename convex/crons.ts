import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
  'check grace periods',
  { hourUTC: 10, minuteUTC: 0 },
  internal.subscriptions.checkGracePeriods
);

crons.weekly(
  'send usage summary digest',
  { dayOfWeek: 'monday', hourUTC: 9, minuteUTC: 0 },
  internal.jobs.sendUsageSummary
);

export default crons;

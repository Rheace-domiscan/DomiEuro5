import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
  'check grace periods',
  { hourUTC: 10, minuteUTC: 0 },
  internal.subscriptions.checkGracePeriods
);

export default crons;

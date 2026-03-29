import cron from 'node-cron';

import { markFollowUpForStaleComplaints } from '../services/complaintService.js';

export function startFollowUpCron() {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const updated = await markFollowUpForStaleComplaints();
      if (updated > 0) {
        console.log(`[cron] Updated ${updated} complaints to follow-up required`);
      }
    } catch (error) {
      console.error('[cron] Failed to update follow-up status', error);
    }
  });
}

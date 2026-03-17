import * as cron from 'node-cron';
import { container } from '../main/container';
import { logger } from '../utils/logger';

// Load directly through classes for typesafety
import { RecurringBillingService } from '../modules/billing/application/services/RecurringBillingService';
import { IntelligenceService } from '../modules/intelligence/application/services/IntelligenceService';
import { AuthService } from '../modules/auth/application/services/AuthService';

const runRecurringBilling = async () => {
  try {
    const recurringBillingService = container.resolve(RecurringBillingService);
    await recurringBillingService.generateRecurringInvoices();
  } catch (err: any) {
    logger.error(`⏰ Daily recurring billing cron failed: ${err.message}`);
  }
};

const runOverdueDetection = async () => {
  try {
    // Left as stub for overdue detection (could be part of BillingService)
    logger.info('⏰ Overdue invoices scanned (Stub)');
  } catch (err: any) {
    logger.error(`⏰ Daily overdue detection cron failed: ${err.message}`);
  }
};

const runForecastRecalculation = async () => {
  try {
    const intelligenceService = container.resolve(IntelligenceService);
    // Left as stub for bulk recalculation
    logger.info('⏰ Forecast recalculation complete (Stub)');
  } catch (err: any) {
    logger.error(`⏰ Forecast recalculation cron failed: ${err.message}`);
  }
};

const runOtpCleanup = async () => {
  try {
    const authService = container.resolve(AuthService);
    // Cleanup OTP stub or feature
  } catch (err: any) {
    logger.error(`⏰ Hourly OTP cleanup cron failed: ${err.message}`);
  }
};

let jobs: cron.ScheduledTask[] = [];

export const scheduler = {
  /**
   * Initialize all scheduled jobs
   */
  start(): void {
    logger.info('⏰ Starting scheduler...');

    // 1. Daily 8:00 AM — generate recurring invoices
    jobs.push(cron.schedule('0 8 * * *', runRecurringBilling, { timezone: 'Asia/Kolkata' }));

    // 2. Daily 9:00 AM — detect overdue invoices
    jobs.push(cron.schedule('0 9 * * *', runOverdueDetection, { timezone: 'Asia/Kolkata' }));

    // 3. Every Sunday midnight — recalculate forecasts
    jobs.push(cron.schedule('0 0 * * 0', runForecastRecalculation, { timezone: 'Asia/Kolkata' }));

    // 4. Every hour — cleanup expired OTPs
    jobs.push(cron.schedule('0 * * * *', runOtpCleanup, { timezone: 'Asia/Kolkata' }));

    logger.info('⏰ Scheduler started successfully.');
  },

  stop(): void {
    jobs.forEach(job => job.stop());
    jobs = [];
    logger.info('⏰ Scheduler stopped.');
  }
};

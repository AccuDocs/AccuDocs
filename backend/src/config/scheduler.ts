import * as cron from 'node-cron';
import { container } from '../main/container';
import { logger } from '../utils/logger';

// Load directly through classes for typesafety
import { RecurringBillingService } from '../modules/billing/application/services/RecurringBillingService';
import { RecurringInvoiceService } from '../modules/billing/application/services/RecurringInvoiceService';
import { CurrencyService } from '../modules/billing/application/services/CurrencyService';
import { IntelligenceService } from '../modules/intelligence/application/services/IntelligenceService';
import { AuthService } from '../modules/auth/application/services/AuthService';

const runRecurringBilling = async () => {
  try {
    // Legacy recurring billing (from Phase 1 RecurringInvoiceTemplate)
    const recurringBillingService = container.resolve(RecurringBillingService);
    await recurringBillingService.generateRecurringInvoices();
  } catch (err: any) {
    logger.error(`⏰ Daily recurring billing (legacy) cron failed: ${err.message}`);
  }
};

const runRecurringInvoices = async () => {
  try {
    // Phase 2 recurring invoices
    const recurringInvoiceService = container.resolve(RecurringInvoiceService);
    await recurringInvoiceService.processDueRecurringInvoices();
  } catch (err: any) {
    logger.error(`⏰ Daily recurring invoices cron failed: ${err.message}`);
  }
};

const runCurrencyRateFetch = async () => {
  try {
    const currencyService = container.resolve(CurrencyService);
    await currencyService.fetchLiveRates();
  } catch (err: any) {
    logger.error(`⏰ Daily currency rate fetch cron failed: ${err.message}`);
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

    // 1. Daily 6:00 AM IST — generate recurring invoices (Phase 2)
    jobs.push(cron.schedule('0 6 * * *', runRecurringInvoices, { timezone: 'Asia/Kolkata' }));

    // 2. Daily 6:30 AM IST — legacy recurring billing (Phase 1)
    jobs.push(cron.schedule('30 6 * * *', runRecurringBilling, { timezone: 'Asia/Kolkata' }));

    // 3. Daily 7:00 AM IST — fetch live currency rates
    jobs.push(cron.schedule('0 7 * * *', runCurrencyRateFetch, { timezone: 'Asia/Kolkata' }));

    // 4. Daily 9:00 AM — detect overdue invoices
    jobs.push(cron.schedule('0 9 * * *', runOverdueDetection, { timezone: 'Asia/Kolkata' }));

    // 5. Every Sunday midnight — recalculate forecasts
    jobs.push(cron.schedule('0 0 * * 0', runForecastRecalculation, { timezone: 'Asia/Kolkata' }));

    // 6. Every hour — cleanup expired OTPs
    jobs.push(cron.schedule('0 * * * *', runOtpCleanup, { timezone: 'Asia/Kolkata' }));

    logger.info('⏰ Scheduler started successfully.');
  },

  stop(): void {
    jobs.forEach(job => job.stop());
    jobs = [];
    logger.info('⏰ Scheduler stopped.');
  }
};

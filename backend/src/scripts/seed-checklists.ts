import 'reflect-metadata';
import { ChecklistTemplate } from '../models';
import { connectDatabase, disconnectDatabase, sequelize } from '../config/database.config';
import { logger } from '../utils/logger';

const defaultTemplates = [
  {
    name: 'GST Monthly Checklist',
    serviceType: 'gst',
    description: 'Standard checklist for GST Monthly Return filing',
    isDefault: true,
    items: [
      { label: 'Sale Invoices', required: true, category: 'Income' },
      { label: 'Purchase Invoices', required: true, category: 'Expenses' },
      { label: 'Bank Statement', required: true, category: 'Bank' },
      { label: 'GSTR-2B Reconciliation', required: false, category: 'Compliance' }
    ]
  },
  {
    name: 'Income Tax Return (ITR)',
    serviceType: 'itr',
    description: 'Checklist for Individual ITR filing',
    isDefault: true,
    items: [
      { label: 'Form 16 / 16A', required: true, category: 'Income' },
      { label: 'Form 26AS / AIS / TIS', required: true, category: 'Verification' },
      { label: 'Investment Proofs (80C, 80D)', required: false, category: 'Deductions' },
      { label: 'Bank Statement', required: true, category: 'Bank' }
    ]
  },
  {
    name: 'TDS Quarterly Return',
    serviceType: 'tds',
    description: 'Checklist for TDS return filing (24Q/26Q)',
    isDefault: true,
    items: [
      { label: 'Salary Sheet', required: true, category: 'Payroll' },
      { label: 'Challan Details', required: true, category: 'Payment' },
      { label: 'PAN Data', required: true, category: 'KYC' }
    ]
  }
];

async function seed() {
  try {
    await connectDatabase();
    logger.info('🌱 Seeding Checklist Templates...');

    for (const template of defaultTemplates) {
      const [record, created] = await ChecklistTemplate.findOrCreate({
        where: { name: template.name },
        defaults: template as any
      });
      if (created) {
        logger.info(`✅ Created template: ${template.name}`);
      } else {
        logger.info(`ℹ️ Template already exists: ${template.name}`);
      }
    }

    logger.info('🎉 Seeding complete.');
  } catch (error: any) {
    logger.error('❌ Seeding failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

seed();

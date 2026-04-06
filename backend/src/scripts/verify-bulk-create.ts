import 'reflect-metadata';
import { Checklist, ChecklistTemplate, Client, Organization, User } from '../models';
import { connectDatabase, disconnectDatabase } from '../config/database.config';
import { container } from 'tsyringe';
import { ChecklistService } from '../modules/checklist/application/services/ChecklistService';
import { SequelizeChecklistRepository } from '../modules/checklist/infrastructure/repositories/SequelizeChecklistRepository';
import { SequelizeClientRepository } from '../modules/client/infrastructure/repositories/SequelizeClientRepository';
import { logger } from '../utils/logger';

// Mock DI
container.register("IChecklistRepository", { useClass: SequelizeChecklistRepository });
container.register("IClientRepository", { useClass: SequelizeClientRepository });

async function verify() {
  try {
    await connectDatabase();
    
    // 1. Get an organization
    const org = await Organization.findOne();
    if (!org) throw new Error('No organization found');
    
    // 2. Get a user
    const user = await User.findOne({ where: { organizationId: org.id } });
    if (!user) throw new Error('No user found');
    
    // 3. Get a template
    const template = await ChecklistTemplate.findOne();
    if (!template) throw new Error('No template found. Run seed-checklists first.');
    
    logger.info(`Testing with Org: ${org.name}, Template: ${template.name}`);
    
    const service = container.resolve(ChecklistService);
    
    // 4. Test Bulk Create for 'all' clients
    const result = await service.bulkCreateChecklists(org.id, user.id, {
      templateId: template.id,
      clientIds: 'all',
      financialYear: '2024-25',
      notes: 'Test bulk create'
    });
    
    logger.info(`✅ Bulk create result: ${JSON.stringify(result)}`);
    
    // 5. Verify in DB
    const count = await Checklist.count({ where: { templateId: template.id } });
    logger.info(`📊 Total checklists in DB for this template: ${count}`);

  } catch (error: any) {
    console.error('❌ Verification failed:', error);
    if (error.stack) console.error(error.stack);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

verify();

import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase, Organization as OrganizationModel, User as UserModel } from '../config/database.config';
import { BillingService } from '../modules/billing/application/services/BillingService';
import { SequelizeInvoiceRepository } from '../modules/billing/infrastructure/repositories/SequelizeInvoiceRepository';
import { SequelizeClientRepository } from '../modules/client/infrastructure/repositories/SequelizeClientRepository';

async function reproduce() {
  try {
    await connectDatabase();
    
    const invoiceRepo = new SequelizeInvoiceRepository();
    const clientRepo = new SequelizeClientRepository();
    const service = new BillingService(invoiceRepo, clientRepo);
    
    // Find a valid org and admin
    const org: any = await OrganizationModel.findOne();
    const admin: any = await UserModel.findOne({ where: { role: 'admin' } }) || await UserModel.findOne();

    if (!org || !admin) {
        console.error('❌ Missing org or admin');
        return;
    }

    // Find a valid client for this org
    const [clients]: any[] = await sequelize.query(`SELECT id FROM clients WHERE organization_id = '${org.id}' LIMIT 1`);
    if (!clients || clients.length === 0) {
        console.error('❌ No clients found for org:', org.id);
        return;
    }
    const clientId = clients[0].id;

    const payload = {
        "clientId": clientId,
        "invoiceDate": "2026-04-05",
        "dueDate": "2026-05-16",
        "notes": "reproduction-test",
        "clientGstin": "27AAKFN4512P1ZC",
        "gstType": "IGST",
        "lineItems": [
            {
                "serviceTemplateId": "fallback-tds-return",
                "description": "TDS Return Filing",
                "sacCode": "998233",
                "quantity": 1,
                "unitRate": 2200
            }
        ]
    };

    console.log(`🚀 Executing createInvoice with org: ${org.id}, admin: ${admin.id}, client: ${clientId}`);
    
    // Enable debug logging for Sequelize
    sequelize.options.logging = (sql: string) => console.log('SQL:', sql);

    try {
        const result = await service.createInvoice(org.id, admin.id, payload);
        console.log('✅ Created!', JSON.stringify(result));
    } catch (err: any) {
        console.error('❌ REPRODUCED ERROR:');
        console.error('Message:', err.message);
        if (err.original) {
            console.error('Raw PG Error:', err.original.message);
            console.error('Failed on Column:', err.original.column);
            console.error('Failed on Table:', err.original.table);
            console.error('Constraint:', err.original.constraint);
        }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

reproduce();

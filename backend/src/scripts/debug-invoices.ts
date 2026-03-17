import 'reflect-metadata';
import { container } from '../main/container';
import { BillingService } from '../modules/billing/application/services/BillingService';

async function debugInvoices() {
  try {
    console.log('Resolving BillingService from container...');
    const service = container.resolve(BillingService);
    
    console.log('Calling service.getInvoices...');
    const result = await service.getInvoices(
      '25f0e52d-0da8-42e8-9db0-e9924b8715cb',
      {},
      { page: 1, limit: 10 }
    );
    
    console.log('Success! Found', result.invoices.length, 'invoices');
    process.exit(0);
  } catch (err: any) {
    console.error('Service Error Details:');
    console.error('Name:', err.name);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

debugInvoices();

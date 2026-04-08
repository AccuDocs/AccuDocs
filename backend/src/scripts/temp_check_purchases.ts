import { ClientPurchase } from '../models/client-purchase.model';
import { sequelize } from '../config/database.config';

async function check() {
  const clientId = '4b403662-2141-4434-b89f-ebd73a5e22ae';
  const count = await ClientPurchase.count({ where: { clientId } });
  console.log(`Total purchases for client ${clientId}: ${count}`);
  
  const purchases = await ClientPurchase.findAll({ where: { clientId }, limit: 5 });
  console.log('Sample purchases:', JSON.stringify(purchases, null, 2));
  
  process.exit(0);
}

check();

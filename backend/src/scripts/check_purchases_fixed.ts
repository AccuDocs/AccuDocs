import { ClientPurchase } from '../models/client-purchase.model';
import { sequelize } from '../config/database.config';

async function check() {
  await sequelize.authenticate();
  const clientId = '4b403662-2141-4434-b89f-ebd73a5e22ae';
  const count = await ClientPurchase.count({ where: { clientId } });
  console.log(`--- DB CHECK ---`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Total Count: ${count}`);
  
  const entries = await ClientPurchase.findAll({
    where: { clientId },
    limit: 5,
    order: [['created_at', 'DESC']]
  });
  
  console.log(`Last 5 entries:`);
  entries.forEach(e => {
    console.log(`- Bill: ${e.billNo}, Date: ${e.billDate}, FY: ${e.financialYear}, Org: ${e.organizationId}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});

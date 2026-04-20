const { Sequelize } = require('sequelize');

// Same defaults as env.config.ts
const seq = new Sequelize('accudocs', 'postgres', 'postgres', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function check() {
  try {
    await seq.authenticate();
    console.log('DB connected OK');
    
    const [tables] = await seq.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('warehouses','items','stock_ledger','purchase_orders','stock_transfers','stock_summary','item_categories','item_variants','client_item_pricing','purchase_order_items','stock_transfer_items') ORDER BY table_name"
    );
    
    if (tables.length === 0) {
      console.log('\n*** NO INVENTORY TABLES FOUND ***');
      console.log('Migration 010_inventory_schema.sql needs to be run.');
    } else {
      console.log('\nInventory tables found:', tables.map(t => t.table_name));
      console.log('Expected: 11 tables. Found:', tables.length);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await seq.close();
  }
}

check();

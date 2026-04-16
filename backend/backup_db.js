const fs = require('fs');
const { Client } = require('pg');

const backupPath = 'd:\\AccuDocs-1\\database\\db_backup_' + Date.now() + '.json';

async function backup() {
    const client = new Client({
        connectionString: 'postgresql://postgres:AccuDocs2026!@16.16.137.174:5432/postgres',
    });

    try {
        await client.connect();
        
        console.log('Fetching tables...');
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_type='BASE TABLE'
        `);
        
        const tables = res.rows.map(row => row.table_name);
        const dump = {};

        for (const table of tables) {
            console.log(`Exporting \${table}...`);
            const dataRes = await client.query(`SELECT * FROM "\${table}"`);
            dump[table] = dataRes.rows;
        }

        fs.writeFileSync(backupPath, JSON.stringify(dump, null, 2));
        console.log(`Database exported successfully to \${backupPath}`);
        
    } catch (err) {
        console.error('Backup failed:', err);
    } finally {
        await client.end();
    }
}

backup();

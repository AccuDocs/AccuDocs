import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id, email, password_hash, is_active FROM super_admins WHERE email = 'admin@accudocs.app'");
        if (res.rows.length === 0) {
            console.log('Admin NOT FOUND');
        } else {
            const admin = res.rows[0];
            console.log('Admin FOUND:', admin.email);
            console.log('Hash:', admin.password_hash);
            console.log('Is Active:', admin.is_active);
            
            if (admin.password_hash) {
                const isMatch = await bcrypt.compare('password123', admin.password_hash);
                console.log('Manual Match Test (password123):', isMatch);
            } else {
                console.log('Hash is NULL/Empty');
            }
        }
        
        // Also check column types
        const schema = await client.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'super_admins'");
        console.log('Schema:', JSON.stringify(schema.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
verify();

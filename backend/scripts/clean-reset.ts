import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function reset() {
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
        const email = 'admin@accudocs.app';
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const rawHash = await bcrypt.hash(password, salt);
        const cleanHash = rawHash.replace(/\s/g, '');
        
        console.log('Clean Hash:', cleanHash);
        await client.query("UPDATE super_admins SET password_hash = $1, is_active = true WHERE email = $2", [cleanHash, email]);
        console.log('FINAL UPDATE SUCCESS');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
reset();

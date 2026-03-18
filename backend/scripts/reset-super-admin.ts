import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetAdmin() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    const email = 'admin@accudocs.app';
    const password = 'password123';
    const name = 'System Admin';

    try {
        await client.connect();
        console.log('Connected to database');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if user exists
        const res = await client.query('SELECT id FROM super_admins WHERE email = $1', [email]);

        if (res.rows.length > 0) {
            console.log(`Updating existing admin: ${email}`);
            await client.query(
                'UPDATE super_admins SET password_hash = $1, is_active = true WHERE email = $2',
                [hashedPassword, email]
            );
            console.log('Update successful');
        } else {
            console.log(`Creating new admin: ${email}`);
            await client.query(
                'INSERT INTO super_admins (name, email, password_hash, is_active) VALUES ($1, $2, $3, true)',
                [name, email, hashedPassword]
            );
            console.log('Creation successful');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

resetAdmin();

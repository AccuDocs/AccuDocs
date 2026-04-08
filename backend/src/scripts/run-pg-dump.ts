import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

function runPgDump() {
  const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
  const outputPath = path.resolve(process.cwd(), '../full_database_dump.sql');
  
  // Extract credentials from .env or current config
  // The .env should have DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
  const host = process.env.DB_HOST || '16.16.137.174';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const dbName = process.env.DB_NAME || 'postgres';
  const password = process.env.DB_PASSWORD;

  if (!password) {
    console.error('ERROR: DB_PASSWORD not found in environment.');
    process.exit(1);
  }

  console.log(`Starting FULL database dump from ${host}...`);
  console.log(`Target: ${outputPath}`);

  try {
    // We use PGPASSWORD env variable to avoid password prompt
    const cmd = `"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${outputPath}"`;
    
    execSync(cmd, {
      env: { ...process.env, PGPASSWORD: password },
      stdio: 'inherit'
    });

    console.log('\nSUCCESS: Full database dump completed!');
    process.exit(0);
  } catch (err) {
    console.error('FAILED to run pg_dump:', err);
    process.exit(1);
  }
}

runPgDump();

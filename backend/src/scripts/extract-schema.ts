import { sequelize } from '../config/database.config';
import * as fs from 'fs';
import * as path from 'path';

async function extractFullSchema() {
  try {
    console.log('Connecting to AWS Database for Full Audit...');
    await sequelize.authenticate();
    console.log('Connected successfully.\n');

    let sqlOutput = '-- AccuDocs AWS FULL Database Schema Dump\n';
    sqlOutput += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlOutput += `-- DB Host: 16.16.137.174\n\n`;

    // 1. EXTRACT ENUMS (TYPES)
    console.log('Extracting Custom Types (Enums)...');
    sqlOutput += '-- --------------------------------------------------------\n';
    sqlOutput += '-- CUSTOM TYPES (ENUMS)\n';
    sqlOutput += '-- --------------------------------------------------------\n\n';
    const [enums]: any = await sequelize.query(`
      SELECT 
        t.typname AS name, 
        string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname;
    `);

    for (const en of enums) {
      sqlOutput += `CREATE TYPE public."${en.name}" AS ENUM (${en.labels});\n`;
    }
    sqlOutput += '\n';

    // 2. EXTRACT TABLES
    console.log('Extracting Tables...');
    const [tables]: any = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'Sequelize%';
    `);

    for (const tableRow of tables) {
      const tableName = tableRow.table_name;
      console.log(`  Processing table: ${tableName}...`);

      const [columns]: any = await sequelize.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length,
          udt_name
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      sqlOutput += `CREATE TABLE public."${tableName}" (\n`;
      const colDefs = columns.map((coll: any) => {
        let type = coll.data_type.toUpperCase();
        if (coll.udt_name.startsWith('enum_')) type = `public."${coll.udt_name}"`;
        else if (coll.udt_name === 'uuid') type = 'UUID';
        else if (coll.udt_name === 'varchar' && coll.character_maximum_length) type = `VARCHAR(${coll.character_maximum_length})`;
        else if (coll.udt_name === 'text') type = 'TEXT';
        else if (coll.udt_name === 'timestamp' || coll.udt_name === 'timestamptz') type = 'TIMESTAMPTZ';
        else if (coll.udt_name === 'int4') type = 'INTEGER';
        else if (coll.udt_name === 'int8') type = 'BIGINT';
        else if (coll.udt_name === 'bool') type = 'BOOLEAN';
        else if (coll.udt_name === 'numeric') type = 'NUMERIC';
        else if (coll.udt_name === 'jsonb') type = 'JSONB';

        const nullable = coll.is_nullable === 'YES' ? '' : ' NOT NULL';
        const defaultValue = coll.column_default ? ` DEFAULT ${coll.column_default}` : '';
        return `  "${coll.column_name}" ${type}${nullable}${defaultValue}`;
      });
      sqlOutput += colDefs.join(',\n') + '\n);\n\n';

      // Constraints for this table
      const [constraints]: any = await sequelize.query(`
        SELECT
            tc.constraint_name, kcu.column_name, tc.constraint_type,
            ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name='${tableName}' AND tc.table_schema='public';
      `);

      for (const cons of constraints) {
        if (cons.constraint_type === 'PRIMARY KEY') {
          sqlOutput += `ALTER TABLE public."${tableName}" ADD PRIMARY KEY ("${cons.column_name}");\n`;
        } else if (cons.constraint_type === 'FOREIGN KEY' && cons.foreign_table_name) {
          sqlOutput += `ALTER TABLE public."${tableName}" ADD CONSTRAINT "${cons.constraint_name}" FOREIGN KEY ("${cons.column_name}") REFERENCES public."${cons.foreign_table_name}"("${cons.foreign_column_name}");\n`;
        }
      }
      sqlOutput += '\n-- --------------------------------------------------------\n\n';
    }

    // 3. EXTRACT VIEWS
    console.log('Extracting Views...');
    sqlOutput += '-- VIEWS\n';
    const [views]: any = await sequelize.query(`
      SELECT viewname, definition 
      FROM pg_views 
      WHERE schemaname = 'public';
    `);
    for (const v of views) {
      sqlOutput += `CREATE VIEW public."${v.viewname}" AS\n${v.definition};\n\n`;
    }

    // 4. EXTRACT FUNCTIONS
    console.log('Extracting Functions...');
    sqlOutput += '-- FUNCTIONS\n';
    try {
      const [procs]: any = await sequelize.query(`
        SELECT p.proname, pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public';
      `);
      for (const p of procs) {
        sqlOutput += `${p.definition};\n\n`;
      }
    } catch (e) {
      console.warn('Could not extract functions (possibly permission or version issue). skipping...');
    }

    // 5. EXTRACT TRIGGERS
    console.log('Extracting Triggers...');
    sqlOutput += '-- TRIGGERS\n';
    const [triggers]: any = await sequelize.query(`
      SELECT tgname as name, pg_get_triggerdef(oid) as definition
      FROM pg_trigger
      WHERE tgisinternal = false;
    `);
    for (const t of triggers) {
      sqlOutput += `${t.definition};\n\n`;
    }

    const outputPath = path.resolve(process.cwd(), '../schema_dump.sql');
    fs.writeFileSync(outputPath, sqlOutput);
    console.log(`\nSUCCESS: FULL Schema extracted to ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error('FAILED to extract full schema:', err);
    process.exit(1);
  }
}

extractFullSchema();

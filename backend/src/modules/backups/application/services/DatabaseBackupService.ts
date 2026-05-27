import { injectable } from 'tsyringe';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { once } from 'events';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { google, drive_v3 } from 'googleapis';
import { sequelize } from '../../../../config/database.config';
import { config } from '../../../../config/env.config';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../../../utils/errors';
import { logger } from '../../../../utils/logger';

export type BackupKind = 'schema' | 'full';
export type BackupTrigger = 'manual' | 'scheduled';
export type BackupStatusValue = 'running' | 'success' | 'failed';
export type BackupDestination = 'drive' | 'local';

export interface BackupRunDto {
  id: string;
  kind: BackupKind;
  status: BackupStatusValue;
  triggeredBy: BackupTrigger;
  fileName: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  driveFileId: string | null;
  driveWebUrl: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface LocalBackupFileDto {
  fileName: string;
  kind: BackupKind | null;
  sizeBytes: number;
  modifiedAt: string;
}

interface GeneratedBackup {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  checksumSha256: string;
}

interface DriveUploadResult {
  id: string;
  webViewLink: string | null;
}

interface PgTableInfo {
  oid: number;
  schemaName: string;
  tableName: string;
}

interface PgColumnInfo {
  columnName: string;
  dataType: string;
  columnDefault: string | null;
  notNull: boolean;
}

interface PgConstraintInfo {
  constraintName: string;
  definition: string;
}

interface PgIndexInfo {
  indexName: string;
  indexDefinition: string;
}

interface PgSequenceInfo {
  schemaName: string;
  sequenceName: string;
  dataType: string;
  startValue: string | number;
  minValue: string | number;
  maxValue: string | number;
  incrementBy: string | number;
  cycle: boolean;
}

@injectable()
export class DatabaseBackupService {
  private static schemaReady: Promise<void> | null = null;
  private static resolvedPgDumpPath: string | null | undefined;

  private readonly localDir = path.resolve(process.cwd(), config.backup.localDir);
  private running = false;

  async getStatus() {
    await this.ensureSchema();
    const latest = await this.listRuns(1);
    const pgDumpAvailable = await this.isPgDumpAvailable();
    const resolvedPgDumpPath = pgDumpAvailable
      ? await this.resolvePgDumpPath()
      : null;
    const drive = this.getDriveConfigStatus();

    return {
      enabled: config.backup.enabled,
      cron: config.backup.cron,
      timezone: config.backup.timezone,
      destination: config.backup.destination,
      localDir: config.backup.localDir,
      retentionDays: config.backup.retentionDays,
      pgDumpPath: config.backup.pgDumpPath,
      pgDumpResolvedPath: resolvedPgDumpPath,
      pgDumpAvailable,
      backupEngine: pgDumpAvailable ? 'pg_dump' : 'built-in SQL fallback',
      driveConfigured: drive.configured,
      driveFolderConfigured: Boolean(config.backup.googleDriveFolderId),
      serviceAccountEmail: drive.serviceAccountEmail,
      lastRun: latest[0] ?? null,
    };
  }

  async listRuns(limit = 20): Promise<BackupRunDto[]> {
    await this.ensureSchema();
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const [rows] = await sequelize.query(
      `
        SELECT
          id,
          kind,
          status,
          triggered_by AS "triggeredBy",
          file_name AS "fileName",
          size_bytes AS "sizeBytes",
          checksum_sha256 AS "checksumSha256",
          drive_file_id AS "driveFileId",
          drive_web_url AS "driveWebUrl",
          error_message AS "errorMessage",
          started_at AS "startedAt",
          completed_at AS "completedAt"
        FROM backup_runs
        ORDER BY started_at DESC
        LIMIT :limit
      `,
      { replacements: { limit: safeLimit } }
    );

    return rows as BackupRunDto[];
  }

  async runBackupPair(
    triggeredBy: BackupTrigger,
    userId?: string,
    destination: BackupDestination = config.backup.destination
  ): Promise<BackupRunDto[]> {
    const results: BackupRunDto[] = [];
    results.push(await this.runBackup('schema', triggeredBy, userId, destination));
    results.push(await this.runBackup('full', triggeredBy, userId, destination));
    return results;
  }

  async runBackup(
    kind: BackupKind,
    triggeredBy: BackupTrigger,
    userId?: string,
    destination: BackupDestination = config.backup.destination
  ): Promise<BackupRunDto> {
    if (this.running) {
      throw new BadRequestError('A database backup is already running');
    }

    if (destination === 'drive') {
      this.assertDriveConfigured();
    }

    await this.ensureSchema();
    await fsp.mkdir(this.localDir, { recursive: true });

    const id = crypto.randomUUID();
    const startedAt = new Date();
    this.running = true;

    await sequelize.query(
      `
        INSERT INTO backup_runs (id, kind, status, triggered_by, started_at, created_by)
        VALUES (:id, :kind, 'running', :triggeredBy, :startedAt, :createdBy)
      `,
      {
        replacements: {
          id,
          kind,
          triggeredBy,
          startedAt,
          createdBy: userId ?? null,
        },
      }
    );

    try {
      const generated = await this.generateBackup(kind);
      const uploaded = destination === 'drive'
        ? await this.uploadToDrive(generated)
        : null;

      await sequelize.query(
        `
          UPDATE backup_runs
          SET status = 'success',
              file_name = :fileName,
              local_path = :localPath,
              size_bytes = :sizeBytes,
              checksum_sha256 = :checksumSha256,
              drive_file_id = :driveFileId,
              drive_web_url = :driveWebUrl,
              completed_at = NOW()
          WHERE id = :id
        `,
        {
          replacements: {
            id,
            fileName: generated.fileName,
            localPath: generated.filePath,
            sizeBytes: generated.sizeBytes,
            checksumSha256: generated.checksumSha256,
            driveFileId: uploaded?.id ?? null,
            driveWebUrl: uploaded?.webViewLink ?? null,
          },
        }
      );

      await this.cleanupOldLocalBackups();
      return (await this.getRun(id))!;
    } catch (error: any) {
      const message = error?.message || 'Backup failed';
      await sequelize.query(
        `
          UPDATE backup_runs
          SET status = 'failed',
              error_message = :message,
              completed_at = NOW()
          WHERE id = :id
        `,
        { replacements: { id, message } }
      );
      logger.error(`Database ${kind} backup failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  async runScheduledBackups(): Promise<void> {
    if (!config.backup.enabled) return;

    const destination = config.backup.destination as BackupDestination;

    if (destination === 'drive' && !this.getDriveConfigStatus().configured) {
      logger.warn('Daily database backup skipped: Google Drive backup credentials are not configured');
      return;
    }

    await this.runBackupPair('scheduled', undefined, destination);
  }

  async testGoogleDrive(): Promise<{ ok: boolean; folderId: string; serviceAccountEmail: string | null }> {
    this.assertDriveConfigured();
    const drive = await this.createDriveClient();
    await drive.files.get({
      fileId: config.backup.googleDriveFolderId,
      fields: 'id,name,mimeType',
      supportsAllDrives: true,
    });

    const status = this.getDriveConfigStatus();
    return {
      ok: true,
      folderId: config.backup.googleDriveFolderId,
      serviceAccountEmail: status.serviceAccountEmail,
    };
  }

  async listLocalBackupFiles(): Promise<LocalBackupFileDto[]> {
    await fsp.mkdir(this.localDir, { recursive: true });
    const files = await fsp.readdir(this.localDir).catch(() => []);
    const backups = await Promise.all(files
      .filter((file) => file.endsWith('.sql.gz'))
      .map(async (file) => {
        const filePath = this.resolveLocalBackupPath(file);
        const stats = await fsp.stat(filePath).catch(() => null);
        if (!stats?.isFile()) return null;

        return {
          fileName: file,
          kind: this.kindFromFileName(file),
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      }));

    return backups
      .filter((file): file is LocalBackupFileDto => Boolean(file))
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
  }

  async getLocalBackupFile(fileName: string): Promise<{ fileName: string; filePath: string; sizeBytes: number }> {
    const filePath = this.resolveLocalBackupPath(fileName);
    const stats = await fsp.stat(filePath).catch(() => null);

    if (!stats?.isFile()) {
      throw new NotFoundError('Backup file not found');
    }

    return {
      fileName: path.basename(fileName),
      filePath,
      sizeBytes: stats.size,
    };
  }

  async deleteLocalBackupFile(fileName: string): Promise<{ fileName: string; deleted: boolean }> {
    const file = await this.getLocalBackupFile(fileName);
    await fsp.unlink(file.filePath);
    return {
      fileName: file.fileName,
      deleted: true,
    };
  }

  private async getRun(id: string): Promise<BackupRunDto | null> {
    const [rows] = await sequelize.query(
      `
        SELECT
          id,
          kind,
          status,
          triggered_by AS "triggeredBy",
          file_name AS "fileName",
          size_bytes AS "sizeBytes",
          checksum_sha256 AS "checksumSha256",
          drive_file_id AS "driveFileId",
          drive_web_url AS "driveWebUrl",
          error_message AS "errorMessage",
          started_at AS "startedAt",
          completed_at AS "completedAt"
        FROM backup_runs
        WHERE id = :id
        LIMIT 1
      `,
      { replacements: { id } }
    );

    return ((rows as BackupRunDto[])[0]) ?? null;
  }

  private async ensureSchema(): Promise<void> {
    if (!DatabaseBackupService.schemaReady) {
      DatabaseBackupService.schemaReady = this.createSchema().catch((error) => {
        DatabaseBackupService.schemaReady = null;
        throw error;
      });
    }

    await DatabaseBackupService.schemaReady;
  }

  private async createSchema(): Promise<void> {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS backup_runs (
        id              UUID        NOT NULL PRIMARY KEY,
        kind            VARCHAR(20) NOT NULL CHECK (kind IN ('schema', 'full')),
        status          VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
        triggered_by    VARCHAR(20) NOT NULL CHECK (triggered_by IN ('manual', 'scheduled')),
        file_name       TEXT,
        local_path      TEXT,
        size_bytes      BIGINT,
        checksum_sha256 VARCHAR(64),
        drive_file_id   TEXT,
        drive_web_url   TEXT,
        error_message   TEXT,
        started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at    TIMESTAMPTZ,
        created_by      UUID
      )
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS backup_runs_started_at_idx
      ON backup_runs(started_at DESC)
    `);
  }

  private async generateBackup(kind: BackupKind): Promise<GeneratedBackup> {
    const dbName = this.safeName(config.database.name);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const fileName = `accudocs-${dbName}-${kind}-${stamp}.sql.gz`;
    const filePath = path.join(this.localDir, fileName);
    const pgDumpPath = await this.resolvePgDumpPath();

    if (pgDumpPath) {
      await this.generatePgDumpBackup(kind, filePath, pgDumpPath);
    } else {
      logger.warn('pg_dump was not found; using built-in SQL backup fallback');
      await this.generateBuiltInSqlBackup(kind, filePath);
    }

    const stats = await fsp.stat(filePath);
    const checksumSha256 = await this.sha256(filePath);
    return { fileName, filePath, sizeBytes: stats.size, checksumSha256 };
  }

  private async generatePgDumpBackup(kind: BackupKind, filePath: string, pgDumpPath: string): Promise<void> {
    const args = [
      '--host', config.database.host,
      '--port', String(config.database.port),
      '--username', config.database.user,
      '--dbname', config.database.name,
      '--no-owner',
      '--no-privileges',
      '--clean',
      '--if-exists',
    ];

    if (kind === 'schema') {
      args.push('--schema-only');
    }

    const stderr: string[] = [];
    const child = spawn(pgDumpPath, args, {
      env: {
        ...process.env,
        PGPASSWORD: config.database.password,
        PGSSLMODE: config.database.ssl ? 'require' : process.env.PGSSLMODE,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stderr.on('data', (chunk) => {
      stderr.push(String(chunk));
    });

    const closePromise = new Promise<void>((resolve, reject) => {
      child.on('error', (error: any) => {
        if (error?.code === 'ENOENT') {
          reject(new ServiceUnavailableError(
            'pg_dump was not found. Install PostgreSQL client tools or set PG_DUMP_PATH to pg_dump.exe.'
          ));
          return;
        }

        reject(error);
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}: ${stderr.join('').slice(-2000)}`));
        }
      });
    });

    try {
      await Promise.all([
        pipeline(child.stdout, zlib.createGzip({ level: 9 }), fs.createWriteStream(filePath, { flags: 'wx' })),
        closePromise,
      ]);
    } catch (error) {
      await fsp.unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  private async generateBuiltInSqlBackup(kind: BackupKind, filePath: string): Promise<void> {
    const tables = await this.getPublicTables();
    const sequences = await this.getPublicSequences();

    await this.writeCompressedSql(filePath, async (write) => {
      await write('-- AccuDocs built-in PostgreSQL backup\n');
      await write(`-- Database: ${config.database.name}\n`);
      await write(`-- Backup kind: ${kind}\n`);
      await write(`-- Generated at: ${new Date().toISOString()}\n\n`);
      await write('CREATE EXTENSION IF NOT EXISTS pgcrypto;\n');
      await write('CREATE SCHEMA IF NOT EXISTS public;\n\n');

      for (const table of [...tables].reverse()) {
        await write(`DROP TABLE IF EXISTS ${this.qualifiedName(table.schemaName, table.tableName)} CASCADE;\n`);
      }

      for (const sequence of sequences) {
        await write(`DROP SEQUENCE IF EXISTS ${this.qualifiedName(sequence.schemaName, sequence.sequenceName)} CASCADE;\n`);
      }

      await write('\n');

      for (const sequence of sequences) {
        await write(this.createSequenceSql(sequence));
      }

      for (const table of tables) {
        await this.writeCreateTableSql(write, table);
      }

      if (kind === 'full') {
        for (const table of tables) {
          await this.writeTableDataSql(write, table);
        }
      }

      for (const table of tables) {
        await this.writeConstraintSql(write, table);
      }

      for (const table of tables) {
        await this.writeIndexSql(write, table);
      }

      if (kind === 'full') {
        for (const sequence of sequences) {
          await this.writeSequenceValueSql(write, sequence);
        }
      }
    });
  }

  private async writeCompressedSql(
    filePath: string,
    writer: (write: (chunk: string) => Promise<void>) => Promise<void>
  ): Promise<void> {
    const gzip = zlib.createGzip({ level: 9 });
    const output = fs.createWriteStream(filePath, { flags: 'wx' });
    const done = pipeline(gzip, output);

    const write = async (chunk: string) => {
      if (!gzip.write(chunk)) {
        await once(gzip, 'drain');
      }
    };

    try {
      await writer(write);
      gzip.end();
      await done;
    } catch (error) {
      gzip.destroy();
      output.destroy();
      await fsp.unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  private async getPublicTables(): Promise<PgTableInfo[]> {
    const [rows] = await sequelize.query(`
      SELECT
        c.oid::int AS "oid",
        n.nspname AS "schemaName",
        c.relname AS "tableName"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
      ORDER BY c.relname
    `);

    return rows as PgTableInfo[];
  }

  private async getPublicSequences(): Promise<PgSequenceInfo[]> {
    const [rows] = await sequelize.query(`
      SELECT
        schemaname AS "schemaName",
        sequencename AS "sequenceName",
        data_type AS "dataType",
        start_value AS "startValue",
        min_value AS "minValue",
        max_value AS "maxValue",
        increment_by AS "incrementBy",
        cycle AS "cycle"
      FROM pg_sequences
      WHERE schemaname = 'public'
      ORDER BY sequencename
    `);

    return rows as PgSequenceInfo[];
  }

  private async getTableColumns(table: PgTableInfo): Promise<PgColumnInfo[]> {
    const [rows] = await sequelize.query(`
      SELECT
        a.attname AS "columnName",
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS "dataType",
        pg_get_expr(ad.adbin, ad.adrelid) AS "columnDefault",
        a.attnotnull AS "notNull"
      FROM pg_attribute a
      LEFT JOIN pg_attrdef ad
        ON ad.adrelid = a.attrelid
       AND ad.adnum = a.attnum
      WHERE a.attrelid = :oid
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `, { replacements: { oid: table.oid } });

    return rows as PgColumnInfo[];
  }

  private async getTableConstraints(table: PgTableInfo): Promise<PgConstraintInfo[]> {
    const [rows] = await sequelize.query(`
      SELECT
        conname AS "constraintName",
        pg_get_constraintdef(oid) AS "definition"
      FROM pg_constraint
      WHERE conrelid = :oid
      ORDER BY
        CASE contype
          WHEN 'p' THEN 0
          WHEN 'u' THEN 1
          WHEN 'f' THEN 2
          ELSE 3
        END,
        conname
    `, { replacements: { oid: table.oid } });

    return rows as PgConstraintInfo[];
  }

  private async getTableIndexes(table: PgTableInfo): Promise<PgIndexInfo[]> {
    const constraints = await this.getTableConstraints(table);
    const constraintNames = new Set(constraints.map((constraint) => constraint.constraintName));
    const [rows] = await sequelize.query(`
      SELECT
        indexname AS "indexName",
        indexdef AS "indexDefinition"
      FROM pg_indexes
      WHERE schemaname = :schemaName
        AND tablename = :tableName
      ORDER BY indexname
    `, {
      replacements: {
        schemaName: table.schemaName,
        tableName: table.tableName,
      },
    });

    return (rows as PgIndexInfo[]).filter((index) => !constraintNames.has(index.indexName));
  }

  private async writeCreateTableSql(write: (chunk: string) => Promise<void>, table: PgTableInfo): Promise<void> {
    const columns = await this.getTableColumns(table);
    const definitions = columns.map((column) => {
      const defaultSql = column.columnDefault ? ` DEFAULT ${column.columnDefault}` : '';
      const notNullSql = column.notNull ? ' NOT NULL' : '';
      return `  ${this.quoteIdent(column.columnName)} ${column.dataType}${defaultSql}${notNullSql}`;
    });

    await write(`CREATE TABLE ${this.qualifiedName(table.schemaName, table.tableName)} (\n`);
    await write(definitions.join(',\n'));
    await write('\n);\n\n');
  }

  private async writeTableDataSql(write: (chunk: string) => Promise<void>, table: PgTableInfo): Promise<void> {
    const columns = await this.getTableColumns(table);
    if (!columns.length) return;

    const [rows] = await sequelize.query(`SELECT * FROM ${this.qualifiedName(table.schemaName, table.tableName)}`);
    const dataRows = rows as Record<string, unknown>[];
    if (!dataRows.length) return;

    const quotedColumns = columns.map((column) => this.quoteIdent(column.columnName)).join(', ');
    const qualifiedTable = this.qualifiedName(table.schemaName, table.tableName);
    const batchSize = 200;

    for (let index = 0; index < dataRows.length; index += batchSize) {
      const batch = dataRows.slice(index, index + batchSize);
      const values = batch.map((row) => {
        const literals = columns.map((column) => this.sqlLiteral(row[column.columnName]));
        return `(${literals.join(', ')})`;
      });

      await write(`INSERT INTO ${qualifiedTable} (${quotedColumns}) VALUES\n`);
      await write(values.join(',\n'));
      await write(';\n');
    }

    await write('\n');
  }

  private async writeConstraintSql(write: (chunk: string) => Promise<void>, table: PgTableInfo): Promise<void> {
    const constraints = await this.getTableConstraints(table);
    for (const constraint of constraints) {
      await write(
        `ALTER TABLE ONLY ${this.qualifiedName(table.schemaName, table.tableName)} ` +
        `ADD CONSTRAINT ${this.quoteIdent(constraint.constraintName)} ${constraint.definition};\n`
      );
    }

    if (constraints.length) {
      await write('\n');
    }
  }

  private async writeIndexSql(write: (chunk: string) => Promise<void>, table: PgTableInfo): Promise<void> {
    const indexes = await this.getTableIndexes(table);
    for (const index of indexes) {
      await write(`${index.indexDefinition};\n`);
    }

    if (indexes.length) {
      await write('\n');
    }
  }

  private async writeSequenceValueSql(write: (chunk: string) => Promise<void>, sequence: PgSequenceInfo): Promise<void> {
    const [rows] = await sequelize.query(
      `SELECT last_value AS "lastValue", is_called AS "isCalled" FROM ${this.qualifiedName(sequence.schemaName, sequence.sequenceName)}`
    );
    const value = (rows as Array<{ lastValue: string | number; isCalled: boolean }>)[0];
    if (!value) return;

    await write(
      `SELECT setval('${this.qualifiedNameLiteral(sequence.schemaName, sequence.sequenceName)}', ` +
      `${this.sqlLiteral(value.lastValue)}, ${value.isCalled ? 'true' : 'false'});\n`
    );
  }

  private createSequenceSql(sequence: PgSequenceInfo): string {
    return (
      `CREATE SEQUENCE ${this.qualifiedName(sequence.schemaName, sequence.sequenceName)}\n` +
      `  AS ${sequence.dataType}\n` +
      `  START WITH ${sequence.startValue}\n` +
      `  INCREMENT BY ${sequence.incrementBy}\n` +
      `  MINVALUE ${sequence.minValue}\n` +
      `  MAXVALUE ${sequence.maxValue}\n` +
      `  ${sequence.cycle ? 'CYCLE' : 'NO CYCLE'};\n\n`
    );
  }

  private async uploadToDrive(backup: GeneratedBackup): Promise<DriveUploadResult> {
    const drive = await this.createDriveClient();
    const response = await drive.files.create({
      requestBody: {
        name: backup.fileName,
        parents: [config.backup.googleDriveFolderId],
        description: `AccuDocs database backup. SHA-256: ${backup.checksumSha256}`,
      },
      media: {
        mimeType: 'application/gzip',
        body: fs.createReadStream(backup.filePath),
      },
      fields: 'id,webViewLink',
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new ServiceUnavailableError('Google Drive upload did not return a file id');
    }

    return {
      id: response.data.id,
      webViewLink: response.data.webViewLink ?? null,
    };
  }

  private async createDriveClient(): Promise<drive_v3.Drive> {
    const credentials = this.getGoogleCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials: credentials as any,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
  }

  private getGoogleCredentials(): Record<string, string> {
    const raw = config.backup.googleServiceAccountKeyJson?.trim();
    if (raw) {
      const json = raw.startsWith('{')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
      const credentials = JSON.parse(json);
      if (credentials.private_key) {
        credentials.private_key = String(credentials.private_key).replace(/\\n/g, '\n');
      }
      return credentials;
    }

    return {
      type: 'service_account',
      client_email: config.backup.googleServiceAccountEmail,
      private_key: config.backup.googleServiceAccountPrivateKey.replace(/\\n/g, '\n'),
    };
  }

  private getDriveConfigStatus(): { configured: boolean; serviceAccountEmail: string | null } {
    let serviceAccountEmail = config.backup.googleServiceAccountEmail || null;
    const raw = config.backup.googleServiceAccountKeyJson?.trim();

    if (raw) {
      try {
        const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
        const credentials = JSON.parse(json);
        serviceAccountEmail = credentials.client_email ?? serviceAccountEmail;
      } catch {
        serviceAccountEmail = serviceAccountEmail ?? 'Invalid service account JSON';
      }
    }

    const hasJson = Boolean(raw);
    const hasSplitCreds = Boolean(config.backup.googleServiceAccountEmail && config.backup.googleServiceAccountPrivateKey);
    return {
      configured: Boolean(config.backup.googleDriveFolderId && (hasJson || hasSplitCreds)),
      serviceAccountEmail,
    };
  }

  private assertDriveConfigured(): void {
    if (!this.getDriveConfigStatus().configured) {
      throw new ServiceUnavailableError(
        'Google Drive backup is not configured. Set GOOGLE_DRIVE_BACKUP_FOLDER_ID and service account credentials.'
      );
    }
  }

  private async isPgDumpAvailable(): Promise<boolean> {
    return Boolean(await this.resolvePgDumpPath());
  }

  private async resolvePgDumpPath(): Promise<string | null> {
    if (DatabaseBackupService.resolvedPgDumpPath !== undefined) {
      return DatabaseBackupService.resolvedPgDumpPath;
    }

    const candidates = await this.pgDumpCandidates();
    for (const candidate of candidates) {
      if (await this.canRunPgDump(candidate)) {
        DatabaseBackupService.resolvedPgDumpPath = candidate;
        return candidate;
      }
    }

    DatabaseBackupService.resolvedPgDumpPath = null;
    return null;
  }

  private async pgDumpCandidates(): Promise<string[]> {
    const candidates = [config.backup.pgDumpPath];

    if (process.platform === 'win32') {
      const roots = [
        process.env.ProgramFiles,
        process.env['ProgramFiles(x86)'],
      ].filter((root): root is string => Boolean(root));

      for (const root of roots) {
        const postgresRoot = path.join(root, 'PostgreSQL');
        const versions = await fsp.readdir(postgresRoot).catch(() => []);

        versions
          .sort((a, b) => Number(b) - Number(a))
          .forEach((version) => {
            candidates.push(path.join(postgresRoot, version, 'bin', 'pg_dump.exe'));
          });
      }
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  private async canRunPgDump(executable: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(executable, ['--version'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
    });
  }

  private async cleanupOldLocalBackups(): Promise<void> {
    if (config.backup.retentionDays <= 0) return;

    const cutoff = Date.now() - config.backup.retentionDays * 24 * 60 * 60 * 1000;
    const files = await fsp.readdir(this.localDir).catch(() => []);
    await Promise.all(files.map(async (file) => {
      if (!file.endsWith('.sql.gz')) return;
      const filePath = path.join(this.localDir, file);
      const stats = await fsp.stat(filePath).catch(() => null);
      if (stats && stats.mtimeMs < cutoff) {
        await fsp.unlink(filePath).catch(() => undefined);
      }
    }));
  }

  private resolveLocalBackupPath(fileName: string): string {
    const baseName = path.basename(fileName);

    if (baseName !== fileName || !/^[a-zA-Z0-9._-]+\.sql\.gz$/.test(baseName)) {
      throw new BadRequestError('Invalid backup file name');
    }

    const filePath = path.resolve(this.localDir, baseName);
    const relative = path.relative(this.localDir, filePath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestError('Invalid backup file path');
    }

    return filePath;
  }

  private kindFromFileName(fileName: string): BackupKind | null {
    const match = fileName.match(/-(schema|full)-\d{8}T\d{6}Z\.sql\.gz$/);
    return match ? match[1] as BackupKind : null;
  }

  private qualifiedName(schemaName: string, objectName: string): string {
    return `${this.quoteIdent(schemaName)}.${this.quoteIdent(objectName)}`;
  }

  private qualifiedNameLiteral(schemaName: string, objectName: string): string {
    return `${schemaName.replace(/'/g, "''")}.${objectName.replace(/'/g, "''")}`;
  }

  private quoteIdent(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private sqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
    if (Buffer.isBuffer(value)) return `'\\\\x${value.toString('hex')}'`;

    const text = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

    return `'${text.replace(/\0/g, '').replace(/'/g, "''")}'`;
  }

  private async sha256(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    await pipeline(fs.createReadStream(filePath), hash);
    return hash.digest('hex');
  }

  private safeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'database';
  }
}

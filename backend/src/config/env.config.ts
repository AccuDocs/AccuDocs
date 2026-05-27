import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), 
    z.enum(['development', 'production', 'test'])).default('development'),
  PORT: z.string().transform((val) => val.trim()).transform(Number).default('3000'),
  API_VERSION: z.string().transform((val) => val.trim()).default('v1'),

  DB_HOST: z.string().trim().default('localhost'),
  DB_PORT: z.string().trim().transform(Number).default('5432'),
  DB_NAME: z.string().trim().default('accudocs'),
  DB_USER: z.string().trim().default('postgres'),
  DB_PASSWORD: z.string().trim().default('postgres'),
  DB_DIALECT: z.string().trim().default('postgres'),
  DB_STORAGE: z.string().trim().optional(),
  DB_POOL_MAX: z.string().trim().transform(Number).default('10'),
  DB_POOL_MIN: z.string().trim().transform(Number).default('0'),
  DB_POOL_ACQUIRE: z.string().trim().transform(Number).default('30000'),
  DB_POOL_IDLE: z.string().trim().transform(Number).default('10000'),
  DB_SSL: z.string().transform((val) => val.trim() === 'true').default('false'),

  REDIS_HOST: z.string().trim().default('localhost'),
  REDIS_PORT: z.string().trim().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().trim().default(''),
  REDIS_DB: z.string().trim().transform(Number).default('0'),

  JWT_SECRET: z.string().trim().min(10, 'JWT Secret too short').default('default-secret-change-me'),
  JWT_EXPIRES_IN: z.string().trim().default('15m'),
  JWT_REFRESH_SECRET: z.string().trim().min(10, 'JWT Refresh Secret too short').default('default-refresh-secret-change-me'),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().default('7d'),

  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET: z.string().default('accudocs-documents'),
  S3_BUCKET_NAME: z.string().default(''),
  AWS_S3_SIGNED_URL_EXPIRY: z.string().transform(Number).default('300'),
  LOCAL_STORAGE_PATH: z.string().default('./storage/documents'),
  OCR_LANG: z.string().default('eng'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('10'),

  WHATSAPP_ENABLED: z.string().transform((val) => val !== 'false').default('true'),

  DB_BACKUP_ENABLED: z.string().transform((val) => val.trim() !== 'false').default('true'),
  DB_BACKUP_CRON: z.string().trim().default('15 2 * * *'),
  DB_BACKUP_TIMEZONE: z.string().trim().default('Asia/Kolkata'),
  DB_BACKUP_LOCAL_DIR: z.string().trim().default('storage/backups'),
  DB_BACKUP_RETENTION_DAYS: z.string().trim().transform(Number).default('14'),
  DB_BACKUP_DESTINATION: z.enum(['drive', 'local']).default('local'),
  DB_BACKUP_AUTH_REQUIRED: z.string().transform((val) => val.trim() === 'true').default('false'),
  PG_DUMP_PATH: z.string().trim().default('pg_dump'),
  GOOGLE_DRIVE_BACKUP_FOLDER_ID: z.string().trim().default(''),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().trim().default(''),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().default(''),
  GOOGLE_SERVICE_ACCOUNT_KEY_JSON: z.string().default(''),

  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('default-secret'),

  OTP_LENGTH: z.string().transform(Number).default('6'),
  OTP_EXPIRY_MINUTES: z.string().transform(Number).default('5'),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default('3'),

  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  AES_ENCRYPTION_KEY: z.string().default('default-32-char-encryption-key!!'),

  LOG_LEVEL: z.string().default('debug'),
  LOG_DIR: z.string().default('logs'),

  CORS_ORIGIN: z.string().default('http://localhost:4200,https://siddharth971.github.io,https://main.d2af6r1ivn8w83.amplifyapp.com'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

const env = parsedEnv.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  apiVersion: env.API_VERSION,

  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    dialect: env.DB_DIALECT,
    storage: env.DB_STORAGE,
    pool: {
      max: env.DB_POOL_MAX,
      min: env.DB_POOL_MIN,
      acquire: env.DB_POOL_ACQUIRE,
      idle: env.DB_POOL_IDLE,
    },
    ssl: env.DB_SSL,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  aws: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: env.S3_BUCKET_NAME || env.AWS_S3_BUCKET,
    signedUrlExpiry: env.AWS_S3_SIGNED_URL_EXPIRY,
  },

  scanner: {
    s3BucketName: env.S3_BUCKET_NAME || env.AWS_S3_BUCKET,
    localStoragePath: env.LOCAL_STORAGE_PATH,
    ocrLang: env.OCR_LANG,
    maxFileSizeMb: env.MAX_FILE_SIZE_MB,
  },

  whatsapp: {
    enabled: env.WHATSAPP_ENABLED,
  },

  backup: {
    enabled: env.DB_BACKUP_ENABLED,
    cron: env.DB_BACKUP_CRON,
    timezone: env.DB_BACKUP_TIMEZONE,
    localDir: env.DB_BACKUP_LOCAL_DIR,
    retentionDays: env.DB_BACKUP_RETENTION_DAYS,
    destination: env.DB_BACKUP_DESTINATION,
    authRequired: env.DB_BACKUP_AUTH_REQUIRED,
    pgDumpPath: env.PG_DUMP_PATH,
    googleDriveFolderId: env.GOOGLE_DRIVE_BACKUP_FOLDER_ID,
    googleServiceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googleServiceAccountPrivateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    googleServiceAccountKeyJson: env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON,
  },

  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
  },

  otp: {
    length: env.OTP_LENGTH,
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  encryption: {
    aesKey: env.AES_ENCRYPTION_KEY,
  },

  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },
};

export const validateConfig = (): void => {
  const required = [
    { key: 'JWT_SECRET', value: config.jwt.secret, default: 'default-secret-change-me' },
    { key: 'JWT_REFRESH_SECRET', value: config.jwt.refreshSecret, default: 'default-refresh-secret-change-me' },
  ];

  if (config.nodeEnv === 'production') {
    for (const { key, value, default: defaultValue } of required) {
      if (value === defaultValue) {
        throw new Error(`❌ ${key} must be set in production environment`);
      }
    }
  }
};

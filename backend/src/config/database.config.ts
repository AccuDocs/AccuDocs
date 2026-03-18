import { Sequelize, Options } from 'sequelize';
import { Pool } from 'pg';
import { config } from './env.config';
import { logger } from '../utils/logger';

// Enhanced logging
logger.info(`--- DB Config DEBUG ---`);
logger.info(`DB Host: ${config.database.host}`);
logger.info(`DB Port type: ${typeof config.database.port}`);
logger.info(`DB Port value: ${config.database.port}`);

const sequelizeOptions: Options = {
  host: config.database.host,
  port: Number(config.database.port) || 5432,
  dialect: config.database.dialect as any,
  storage: config.database.storage,
  logging: (msg) => logger.debug(msg),
  pool: {
    max: config.database.pool.max,
    min: config.database.pool.min,
    acquire: config.database.pool.acquire,
    idle: config.database.pool.idle,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid: false,
  },
  dialectOptions: {
    ssl: (config.nodeEnv === 'production' || (config.database as any).ssl) ? {
      require: true,
      rejectUnauthorized: false
    } : undefined,
  },
  timezone: '+00:00',
};

export const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  sequelizeOptions
);

export const pool = new Pool({
  host: config.database.host,
  port: Number(config.database.port) || 5432,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: (config.nodeEnv === 'production' || (config.database as any).ssl) ? {
    rejectUnauthorized: false
  } : undefined,
  max: config.database.pool.max,
  idleTimeoutMillis: config.database.pool.idle,
  connectionTimeoutMillis: config.database.pool.acquire
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info(`✅ Database connection established successfully via ${config.database.host}:${config.database.port}`);
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('📴 Database connection closed');
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
    throw error;
  }
};

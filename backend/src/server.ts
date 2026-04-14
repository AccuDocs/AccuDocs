import 'reflect-metadata';
import './main/container';
import { createApp } from './app';
import { config, validateConfig, connectDatabase, connectRedis, disconnectDatabase, disconnectRedis } from './config';
import { logger } from './utils/logger';
import { scheduler } from './config/scheduler';
import './models/index'; // Associations run on load
import { initializeOcrWorker, terminateOcrWorker } from './modules/scanner/ocr/engine';
import { ensureScannerSchema } from './modules/scanner/db/repository';

const startServer = async (): Promise<void> => {
  try {
    validateConfig();
    logger.info('✅ Configuration validated');

    logger.info('🚀 Starting AccuDocs Server initialization...');
    await connectDatabase();
    await ensureScannerSchema();
    await initializeOcrWorker();

    try {
      await connectRedis();
    } catch (error) {
      logger.warn('⚠️ Redis connection failed, continuing without Redis');
    }

    const app = createApp();
    const server = app.listen(config.port, () => {
      logger.info(`🚀 AccuDocs API server running on port ${config.port}`);
      logger.info(`🔧 Environment: ${config.nodeEnv}`);
      scheduler.start();
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await disconnectDatabase();
          await disconnectRedis();
          await terminateOcrWorker();
          scheduler.stop();
          logger.info('✅ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};
startServer();

// Trigger restart
// v2: login identifier update

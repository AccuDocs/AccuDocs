import Tesseract from 'tesseract.js';
import { config } from '../../../config/env.config';
import { logger } from '../../../utils/logger';
import { PreviewOcrResult } from '../types';

let workerPromise: Promise<Tesseract.Worker> | null = null;

const createSingletonWorker = async (): Promise<Tesseract.Worker> => {
  logger.info(`Initializing OCR worker with language "${config.scanner.ocrLang}"`);
  const worker = await Tesseract.createWorker(config.scanner.ocrLang, Tesseract.OEM.LSTM_ONLY, {
    logger: (message: Tesseract.LoggerMessage) => {
      if (message.status && message.progress !== undefined) {
        logger.debug(`OCR ${message.status} ${Math.round(message.progress * 100)}%`);
      }
    },
    errorHandler: (error: unknown) => {
      logger.error(`OCR worker error: ${String(error)}`);
    },
  });

  await worker.setParameters({
    preserve_interword_spaces: '1',
  });

  return worker;
};

export const initializeOcrWorker = async (): Promise<Tesseract.Worker> => {
  if (!workerPromise) {
    workerPromise = createSingletonWorker();
  }

  return workerPromise;
};

export const recognizeDocument = async (buffer: Buffer): Promise<PreviewOcrResult> => {
  const worker = await initializeOcrWorker();
  const result = await worker.recognize(buffer);

  return {
    confidence: Math.round(result.data.confidence || 0),
    text: result.data.text || '',
  };
};

export const terminateOcrWorker = async (): Promise<void> => {
  if (!workerPromise) {
    return;
  }

  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
};

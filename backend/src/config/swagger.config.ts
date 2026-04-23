import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.config';

const baseDefinition = {
  openapi: '3.0.0',
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/${config.apiVersion}`,
      description: 'Development Server',
    },
    {
      url: process.env.PUBLIC_API_URL ? `${process.env.PUBLIC_API_URL}/api/${config.apiVersion}` : `http://13.233.143.174:3000/api/${config.apiVersion}`,
      description: 'Production Server',
    }
  ],
};

const superAdminOptions: swaggerJsdoc.Options = {
  definition: {
    ...baseDefinition,
    info: {
      title: 'AccuDocs Super Admin API',
      version: '1.0.0',
      description: 'API for AccuDocs Platform Administration',
    },
  },
  apis: [
    config.nodeEnv === 'production' ? './dist/modules/super-admin/**/*.js' : './src/modules/super-admin/**/*.{ts,js}',
  ],
};

const caFirmOptions: swaggerJsdoc.Options = {
  definition: {
    ...baseDefinition,
    info: {
      title: 'AccuDocs CA Firm API',
      version: '1.0.0',
      description: 'API for CA Firms and Clients',
    },
  },
  apis: [
    config.nodeEnv === 'production' ? './dist/routes/*.js' : './src/routes/*.ts',
    // Auth module
    config.nodeEnv === 'production' ? './dist/modules/auth/**/*.js' : './src/modules/auth/**/*.{ts,js}',
    // Billing module
    config.nodeEnv === 'production' ? './dist/modules/billing/**/*.js' : './src/modules/billing/**/*.{ts,js}',
    // Client module
    config.nodeEnv === 'production' ? './dist/modules/client/**/*.js' : './src/modules/client/**/*.{ts,js}',
    // Compliance module
    config.nodeEnv === 'production' ? './dist/modules/compliance/**/*.js' : './src/modules/compliance/**/*.{ts,js}',
    // Documents & Workspace module
    config.nodeEnv === 'production' ? './dist/modules/documents/**/*.js' : './src/modules/documents/**/*.{ts,js}',
    // GST module
    config.nodeEnv === 'production' ? './dist/modules/gst/**/*.js' : './src/modules/gst/**/*.{ts,js}',
    // Intelligence module
    config.nodeEnv === 'production' ? './dist/modules/intelligence/**/*.js' : './src/modules/intelligence/**/*.{ts,js}',
    // Inventory module
    config.nodeEnv === 'production' ? './dist/modules/inventory/**/*.js' : './src/modules/inventory/**/*.{ts,js}',
    // Notifications & WhatsApp module
    config.nodeEnv === 'production' ? './dist/modules/notifications/**/*.js' : './src/modules/notifications/**/*.{ts,js}',
    // Scanner module
    config.nodeEnv === 'production' ? './dist/modules/scanner/**/*.js' : './src/modules/scanner/**/*.{ts,js}',
    // Tasks module
    config.nodeEnv === 'production' ? './dist/modules/tasks/**/*.js' : './src/modules/tasks/**/*.{ts,js}',
    // Checklist module
    config.nodeEnv === 'production' ? './dist/modules/checklist/**/*.js' : './src/modules/checklist/**/*.{ts,js}',
    // Data module
    config.nodeEnv === 'production' ? './dist/modules/data/**/*.js' : './src/modules/data/**/*.{ts,js}',
  ],
};

export const superAdminSpec = swaggerJsdoc(superAdminOptions);
export const caFirmSpec = swaggerJsdoc(caFirmOptions);

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
    // Exclude super-admin from CA Firm docs
    config.nodeEnv === 'production' ? './dist/modules/!(super-admin)/**/*.js' : './src/modules/!(super-admin)/**/*.{ts,js}',
  ],
};

export const superAdminSpec = swaggerJsdoc(superAdminOptions);
export const caFirmSpec = swaggerJsdoc(caFirmOptions);

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config, superAdminSpec, caFirmSpec } from './config';
import routes from './routes';
import { errorHandler, apiLimiter, auditLogger } from './middlewares';
import { logger } from './utils/logger';
import scannerScanRoutes from './modules/scanner/presentation/routes/scan.routes';
import scannerDocumentRoutes from './modules/scanner/presentation/routes/documents.routes';
import scannerExportRoutes from './modules/scanner/presentation/routes/export.routes';
import { registerInventoryDependencies } from './modules/inventory/inventory.di';


export const createApp = (): Application => {
  // ─── Module DI Registrations ───────────────────────────────────────────────
  registerInventoryDependencies();

  const app = express();

  // Trust proxy for rate limiting and IP detection
  app.set('trust proxy', 1);

  // CORS configuration - Moved to top and made more robust
  const allowedOrigins = config.cors.origin.split(',').map((origin) => origin.trim()).filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        // Exact match
        if (allowed === origin) return true;
        // Match without trailing slash (some browsers or tools might be inconsistent)
        if (allowed.replace(/\/$/, '') === origin.replace(/\/$/, '')) return true;
        return false;
      });

      if (isAllowed || config.nodeEnv === 'development') {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error('CORS policy: Origin not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 204
  }));

  // Security middleware - Adjusted for CORS compatibility
  // Security middleware - Adjusted for Swagger and development flexibility
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null, // Disable forcing HTTPS upgrades
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    hsts: config.nodeEnv === 'production', // Only enable HSTS in production
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // Rate limiting (always applied, even in development, for security consistency)
  app.use(`/api/${config.apiVersion}`, apiLimiter);

  // Swagger documentation
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AccuDocs API Documentation',
  };

  // CA Firm API Docs
  app.use('/api-docs/ca-firm', swaggerUi.serve, (req: any, res: any, next: any) => {
    // We pass the caFirmSpec to the setup
    swaggerUi.setup(caFirmSpec, swaggerOptions)(req, res, next);
  });

  // Super Admin API Docs
  app.use('/api-docs/super-admin', swaggerUi.serve, (req: any, res: any, next: any) => {
    // We pass the superAdminSpec to the setup
    swaggerUi.setup(superAdminSpec, swaggerOptions)(req, res, next);
  });

  // Landing page for API docs
  app.get('/api-docs', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>AccuDocs API Documentation</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f4f7f6; }
            .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            h1 { color: #333; }
            .links { display: flex; gap: 1rem; margin-top: 2rem; }
            a { text-decoration: none; color: white; background: #007bff; padding: 0.75rem 1.5rem; border-radius: 4px; transition: background 0.2s; }
            a:hover { background: #0056b3; }
            .admin { background: #dc3545; }
            .admin:hover { background: #a71d2a; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>AccuDocs API Documentation</h1>
            <p>Select the API documentation you wish to view:</p>
            <div class="links">
              <a href="/api-docs/ca-firm">CA Firm API</a>
              <a href="/api-docs/super-admin" class="admin">Super Admin API</a>
            </div>
          </div>
        </body>
      </html>
    `);
  });

  // Audit Logger (Tracks mutating operations globally if valid auth)
  app.use(auditLogger());

  // Document scanner aliases requested by the scanner workflow
  app.use('/api/scan', scannerScanRoutes);
  app.use('/api/documents', scannerDocumentRoutes);
  app.use('/api/export', scannerExportRoutes);

  // Versioned scanner routes for internal app usage
  app.use(`/api/${config.apiVersion}/scan`, scannerScanRoutes);
  app.use(`/api/${config.apiVersion}/scanner/documents`, scannerDocumentRoutes);
  app.use(`/api/${config.apiVersion}/scanner/export`, scannerExportRoutes);

  // API routes
  app.use(`/api/${config.apiVersion}`, routes);

  // Error handling
  // Express handles 404 natively if no match, 
  // but we fallback to our generic handler
  app.use(errorHandler);

  return app;
};

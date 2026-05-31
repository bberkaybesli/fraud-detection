import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { neo4jConnection } from './config/neo4j';
import { redisConnection } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Import routes (will be created)
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import fraudRoutes from './routes/fraud';
import adminRoutes from './routes/admin';

class App {
    public app: Application;

    constructor() {
        this.app = express();
        this.validateConfiguration();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private validateConfiguration(): void {
        try {
            validateConfig();
            logger.info('Configuration validated successfully');
        } catch (error) {
            logger.error('Configuration validation failed', { error });
            process.exit(1);
        }
    }

    private initializeMiddlewares(): void {
        // Security
        this.app.use(helmet());

        // CORS
        this.app.use(cors({
            origin: config.security.corsOrigins,
            credentials: true
        }));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            const start = Date.now();

            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.info('HTTP Request', {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    duration_ms: duration,
                    ip: req.ip
                });
            });

            next();
        });

        logger.info('Middlewares initialized');
    }

    private initializeRoutes(): void {
        // Health check (no auth required)
        this.app.use('/health', healthRoutes);

        // Authentication
        this.app.use('/auth', authRoutes);

        // API routes (auth required)
        this.app.use('/accounts', accountRoutes);
        this.app.use('/transactions', transactionRoutes);
        this.app.use('/fraud', fraudRoutes);
        this.app.use('/admin', adminRoutes);

        // Root endpoint
        this.app.get('/', (req: Request, res: Response) => {
            res.json({
                success: true,
                data: {
                    service: 'Fraud Detection System',
                    version: '1.0.0',
                    status: 'running',
                    timestamp: new Date().toISOString()
                }
            });
        });

        // 404 handler
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `Route ${req.method} ${req.path} not found`
                }
            });
        });

        logger.info('Routes initialized');
    }

    private initializeErrorHandling(): void {
        this.app.use(errorHandler);
        logger.info('Error handling initialized');
    }

    public async start(): Promise<void> {
        try {
            // Connect to databases
            logger.info('Connecting to databases...');

            await Promise.all([
                neo4jConnection.connect(),
                redisConnection.connect()
            ]);

            logger.info('Database connections established');

            // Start server
            const port = config.port;
            this.app.listen(port, () => {
                logger.info(`🚀 Fraud Detection System started on port ${port}`);
                logger.info(`Environment: ${config.nodeEnv}`);
                logger.info(`Neo4j: ${config.neo4j.uri}`);
                logger.info(`Redis: ${config.redis.url}`);
            });

            // Graceful shutdown
            this.setupGracefulShutdown();
        } catch (error) {
            logger.error('Failed to start application', { error });
            process.exit(1);
        }
    }

    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received, starting graceful shutdown...`);

            try {
                // Close database connections
                await Promise.all([
                    neo4jConnection.close(),
                    redisConnection.close()
                ]);

                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown', { error });
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception', { error });
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection', { reason, promise });
            process.exit(1);
        });
    }
}

// Create and start application
const application = new App();
application.start();

export default application.app;

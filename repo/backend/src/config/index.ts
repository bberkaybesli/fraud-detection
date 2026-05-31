import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Application
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',

    // Neo4j
    neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        user: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password123',
        maxConnectionPoolSize: parseInt(process.env.NEO4J_MAX_CONNECTION_POOL_SIZE || '50', 10),
        connectionTimeout: parseInt(process.env.NEO4J_CONNECTION_TIMEOUT || '30000', 10),
    },

    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    },

    // Authentication
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        adminUsername: process.env.ADMIN_USERNAME || 'admin',
        adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    },

    // MASAK
    masak: {
        mockUrl: process.env.MASAK_MOCK_URL || 'http://localhost:4000',
    },

    // Fraud Detection Thresholds
    fraud: {
        scoreRejectThreshold: parseInt(process.env.FRAUD_SCORE_REJECT_THRESHOLD || '70', 10),
        scoreReviewThreshold: parseInt(process.env.FRAUD_SCORE_REVIEW_THRESHOLD || '30', 10),
        largeTransactionThreshold: parseInt(process.env.LARGE_TRANSACTION_THRESHOLD || '100000', 10),

        // Rate limiting
        rateLimitWindowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10),
        rateLimitMaxTransactions: parseInt(process.env.RATE_LIMIT_MAX_TRANSACTIONS || '10', 10),

        // Cycle detection
        cycleMinLength: parseInt(process.env.CYCLE_MIN_LENGTH || '3', 10),
        cycleMaxLength: parseInt(process.env.CYCLE_MAX_LENGTH || '6', 10),
        cycleMinAmount: parseInt(process.env.CYCLE_MIN_AMOUNT || '1000', 10),
        cycleTimeWindowHours: parseInt(process.env.CYCLE_TIME_WINDOW_HOURS || '24', 10),

        // Smurfing detection
        smurfingMinTxCount: parseInt(process.env.SMURFING_MIN_TX_COUNT || '20', 10),
        smurfingMinTotalAmount: parseInt(process.env.SMURFING_MIN_TOTAL_AMOUNT || '500000', 10),
        smurfingTimeWindowHours: parseInt(process.env.SMURFING_TIME_WINDOW_HOURS || '24', 10),

        // Amount anomaly
        amountAnomalyMultiplier: parseInt(process.env.AMOUNT_ANOMALY_MULTIPLIER || '10', 10),

        // PageRank
        pagerankHighRiskPercentile: parseInt(process.env.PAGERANK_HIGH_RISK_PERCENTILE || '95', 10),
    },

    // Security
    security: {
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:8080').split(','),
        apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100', 10),
    },

    // Monitoring
    monitoring: {
        enableAuditLog: process.env.ENABLE_AUDIT_LOG === 'true',
        auditLogPath: process.env.AUDIT_LOG_PATH || './logs/audit.log',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
    },

    // Batch Processing
    batch: {
        pagerankCronSchedule: process.env.PAGERANK_CRON_SCHEDULE || '0 3 * * *',
        louvainCronSchedule: process.env.LOUVAIN_CRON_SCHEDULE || '30 3 * * *',
    },

    // Development
    dev: {
        debug: process.env.DEBUG === 'true',
        autoSeed: process.env.AUTO_SEED === 'true',
    },
};

// Validate critical configuration
export function validateConfig(): void {
    const errors: string[] = [];

    if (!config.neo4j.uri) {
        errors.push('NEO4J_URI is required');
    }

    if (!config.redis.url) {
        errors.push('REDIS_URL is required');
    }

    if (config.auth.jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters');
    }

    if (config.nodeEnv === 'production') {
        if (config.auth.adminPassword === 'admin123') {
            errors.push('ADMIN_PASSWORD must be changed in production');
        }
        if (config.auth.jwtSecret.includes('change-in-production')) {
            errors.push('JWT_SECRET must be changed in production');
        }
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
}

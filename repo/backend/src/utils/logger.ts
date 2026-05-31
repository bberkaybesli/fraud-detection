import winston from 'winston';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format (more readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create logger instance
export const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    defaultMeta: { service: 'fraud-detection-backend' },
    transports: [
        // Write all logs to combined.log
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),
        // Write error logs to error.log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 5,
        }),
    ],
});

// Add console transport in development
if (config.nodeEnv !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
}

// Audit logger for fraud decisions (MASAK compliance)
export const auditLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'fraud-detection-audit' },
    transports: [
        new winston.transports.File({
            filename: config.monitoring.auditLogPath,
            maxsize: 52428800, // 50MB
            maxFiles: 10,
        }),
    ],
});

// Helper function to log fraud decisions
export function logFraudDecision(data: {
    txId: string;
    decision: 'accept' | 'reject' | 'review';
    fraudScore: number;
    reasons: any[];
    sender: string;
    recipient: string;
    amount: number;
    timestamp: Date;
}): void {
    if (config.monitoring.enableAuditLog) {
        auditLogger.info('FRAUD_DECISION', {
            ...data,
            auditTimestamp: new Date().toISOString(),
        });
    }
}

// Helper function to log MASAK reports
export function logMasakReport(data: {
    reportId: string;
    txId: string;
    reason: string;
    amount: number;
    timestamp: Date;
}): void {
    if (config.monitoring.enableAuditLog) {
        auditLogger.info('MASAK_REPORT', {
            ...data,
            auditTimestamp: new Date().toISOString(),
        });
    }
}

// Add audit method to logger
(logger as any).audit = (message: string, meta?: any) => {
    if (config.monitoring.enableAuditLog) {
        auditLogger.info(message, {
            ...meta,
            auditTimestamp: new Date().toISOString(),
        });
    }
};

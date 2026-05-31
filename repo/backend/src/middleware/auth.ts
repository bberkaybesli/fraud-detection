import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { TokenPayload } from '../models/types';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Access token is required',
            },
            timestamp: new Date(),
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Invalid or expired token',
            },
            timestamp: new Date(),
        });
    }
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Admin access required',
            },
            timestamp: new Date(),
        });
        return;
    }
    next();
}

// Alias for authenticateToken
export const authenticate = authenticateToken;

/**
 * Generate JWT token
 */
export function generateToken(username: string, role: 'admin' | 'service'): string {
    return jwt.sign(
        { username, role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
    );
}

/**
 * Verify credentials (simple implementation for demo)
 */
export function verifyCredentials(username: string, password: string): boolean {
    // In production, use bcrypt and database
    return username === config.auth.adminUsername && password === config.auth.adminPassword;
}

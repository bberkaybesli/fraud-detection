import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /auth/login
 * Login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Username and password are required'
                }
            });
        }

        // Simple authentication (in production, use proper password hashing)
        if (username === config.auth.adminUsername && password === config.auth.adminPassword) {
            // Generate JWT token
            const token = jwt.sign(
                {
                    username,
                    role: 'admin'
                },
                config.auth.jwtSecret,
                {
                    expiresIn: config.auth.jwtExpiresIn
                }
            );

            logger.audit('User logged in', { username });

            return res.json({
                success: true,
                data: {
                    token,
                    username,
                    role: 'admin',
                    expiresIn: config.auth.jwtExpiresIn
                }
            });
        }

        // Invalid credentials
        logger.warn('Failed login attempt', { username });

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid username or password'
            }
        });
    } catch (error) {
        logger.error('Login error', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'LOGIN_ERROR',
                message: 'An error occurred during login'
            }
        });
    }
});

/**
 * POST /auth/verify
 * Verify JWT token
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_TOKEN',
                    message: 'No token provided'
                }
            });
        }

        const decoded = jwt.verify(token, config.auth.jwtSecret);

        return res.json({
            success: true,
            data: {
                valid: true,
                payload: decoded
            }
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired token'
            }
        });
    }
});

export default router;

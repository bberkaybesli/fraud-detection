import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { cycleDetector } from '../engine/cycle-detector';
import { smurfingDetector } from '../engine/smurfing-detector';
import { fraudService } from '../services/fraud-service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /fraud/cycles
 * Get all detected cycles
 */
router.get('/cycles', authenticate, async (req: Request, res: Response) => {
    try {
        const minLength = parseInt(req.query.min_length as string) || 3;
        const maxLength = parseInt(req.query.max_length as string) || 5;
        const limit = parseInt(req.query.limit as string) || 100;

        const cycles = await cycleDetector.findAllCycles(minLength, maxLength, limit);

        return res.json({
            success: true,
            data: {
                cycles,
                count: cycles.length
            }
        });
    } catch (error) {
        logger.error('Failed to get cycles', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_CYCLES_ERROR',
                message: 'Failed to get cycles'
            }
        });
    }
});

/**
 * GET /fraud/cycles/:accountId
 * Get cycles for a specific account
 */
router.get('/cycles/:accountId', authenticate, async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const maxLength = parseInt(req.query.max_length as string) || 5;
        const limit = parseInt(req.query.limit as string) || 50;

        const cycles = await cycleDetector.findCyclesForAccount(accountId, maxLength, limit);

        return res.json({
            success: true,
            data: {
                account_id: accountId,
                cycles,
                count: cycles.length
            }
        });
    } catch (error) {
        logger.error('Failed to get cycles for account', { error, accountId: req.params.accountId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_ACCOUNT_CYCLES_ERROR',
                message: 'Failed to get cycles for account'
            }
        });
    }
});

/**
 * GET /fraud/smurfing
 * Get all smurfing patterns
 */
router.get('/smurfing', authenticate, async (req: Request, res: Response) => {
    try {
        const windowHours = parseInt(req.query.window_hours as string) || 24;
        const minTransactions = parseInt(req.query.min_transactions as string) || 10;
        const maxAvgAmount = parseInt(req.query.max_avg_amount as string) || 10000;
        const limit = parseInt(req.query.limit as string) || 100;

        const patterns = await smurfingDetector.findAllSmurfingPatterns(
            windowHours,
            minTransactions,
            maxAvgAmount,
            limit
        );

        return res.json({
            success: true,
            data: {
                patterns,
                count: patterns.length
            }
        });
    } catch (error) {
        logger.error('Failed to get smurfing patterns', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_SMURFING_ERROR',
                message: 'Failed to get smurfing patterns'
            }
        });
    }
});

/**
 * GET /fraud/smurfing/:accountId
 * Check smurfing for a specific account
 */
router.get('/smurfing/:accountId', authenticate, async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const windowHours = parseInt(req.query.window_hours as string) || 24;

        const pattern = await smurfingDetector.detectSmurfing(accountId, windowHours, 10, 10000);

        if (!pattern) {
            return res.json({
                success: true,
                data: {
                    account_id: accountId,
                    detected: false
                }
            });
        }

        return res.json({
            success: true,
            data: {
                account_id: accountId,
                detected: true,
                pattern
            }
        });
    } catch (error) {
        logger.error('Failed to check smurfing for account', { error, accountId: req.params.accountId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'CHECK_SMURFING_ERROR',
                message: 'Failed to check smurfing for account'
            }
        });
    }
});

/**
 * GET /fraud/stats
 * Get fraud statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
    try {
        const [fraudStats, cycleStats, smurfingStats] = await Promise.all([
            fraudService.getStats(),
            cycleDetector.getCycleStats(),
            smurfingDetector.getSmurfingStats()
        ]);

        return res.json({
            success: true,
            data: {
                fraud: fraudStats,
                cycles: cycleStats,
                smurfing: smurfingStats
            }
        });
    } catch (error) {
        logger.error('Failed to get fraud stats', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_FRAUD_STATS_ERROR',
                message: 'Failed to get fraud statistics'
            }
        });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { blacklistService } from '../services/blacklist-service';
import { accountService } from '../services/account-service';
import { transactionService } from '../services/transaction-service';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * POST /admin/blacklist/accounts
 * Add account to blacklist
 */
router.post('/blacklist/accounts', async (req: Request, res: Response) => {
    try {
        const { account_id, reason } = req.body;

        if (!account_id || !reason) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'account_id and reason are required'
                }
            });
        }

        await blacklistService.addAccount(account_id, reason);

        return res.json({
            success: true,
            data: {
                account_id,
                blacklisted: true
            }
        });
    } catch (error) {
        logger.error('Failed to blacklist account', { error, body: req.body });
        return res.status(500).json({
            success: false,
            error: {
                code: 'BLACKLIST_ERROR',
                message: 'Failed to blacklist account'
            }
        });
    }
});

/**
 * DELETE /admin/blacklist/accounts/:accountId
 * Remove account from blacklist
 */
router.delete('/blacklist/accounts/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;

        await blacklistService.removeAccount(accountId);

        return res.json({
            success: true,
            data: {
                account_id: accountId,
                blacklisted: false
            }
        });
    } catch (error) {
        logger.error('Failed to remove from blacklist', { error, accountId: req.params.accountId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'REMOVE_BLACKLIST_ERROR',
                message: 'Failed to remove from blacklist'
            }
        });
    }
});

/**
 * GET /admin/blacklist
 * Get all blacklisted entities
 */
router.get('/blacklist', async (req: Request, res: Response) => {
    try {
        const [accounts, ips, devices] = await Promise.all([
            blacklistService.getBlacklistedAccounts(),
            blacklistService.getBlacklistedIPs(),
            blacklistService.getBlacklistedDevices()
        ]);

        return res.json({
            success: true,
            data: {
                accounts,
                ips,
                devices,
                total: accounts.length + ips.length + devices.length
            }
        });
    } catch (error) {
        logger.error('Failed to get blacklist', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_BLACKLIST_ERROR',
                message: 'Failed to get blacklist'
            }
        });
    }
});

/**
 * POST /admin/whitelist/accounts
 * Add account to whitelist
 */
router.post('/whitelist/accounts', async (req: Request, res: Response) => {
    try {
        const { account_id } = req.body;

        if (!account_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'account_id is required'
                }
            });
        }

        await blacklistService.addToWhitelist(account_id);

        return res.json({
            success: true,
            data: {
                account_id,
                whitelisted: true
            }
        });
    } catch (error) {
        logger.error('Failed to whitelist account', { error, body: req.body });
        return res.status(500).json({
            success: false,
            error: {
                code: 'WHITELIST_ERROR',
                message: 'Failed to whitelist account'
            }
        });
    }
});

/**
 * GET /admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const [
            transactionStats,
            highRiskAccounts,
            blacklistStats
        ] = await Promise.all([
            transactionService.getTransactionStats(),
            accountService.getHighRiskAccounts(70, 10),
            blacklistService.getStats()
        ]);

        return res.json({
            success: true,
            data: {
                transactions: transactionStats,
                high_risk_accounts: highRiskAccounts,
                blacklist: blacklistStats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Failed to get dashboard data', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'DASHBOARD_ERROR',
                message: 'Failed to get dashboard data'
            }
        });
    }
});

/**
 * GET /admin/accounts/high-risk
 * Get high-risk accounts
 */
router.get('/accounts/high-risk', async (req: Request, res: Response) => {
    try {
        const minScore = parseInt(req.query.min_score as string) || 70;
        const limit = parseInt(req.query.limit as string) || 100;

        const accounts = await accountService.getHighRiskAccounts(minScore, limit);

        return res.json({
            success: true,
            data: {
                accounts,
                count: accounts.length,
                min_score: minScore
            }
        });
    } catch (error) {
        logger.error('Failed to get high-risk accounts', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_HIGH_RISK_ERROR',
                message: 'Failed to get high-risk accounts'
            }
        });
    }
});

/**
 * GET /admin/transactions/flagged
 * Get flagged transactions
 */
router.get('/transactions/flagged', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;

        const transactions = await transactionService.getFlaggedTransactions(limit);

        return res.json({
            success: true,
            data: {
                transactions,
                count: transactions.length
            }
        });
    } catch (error) {
        logger.error('Failed to get flagged transactions', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_FLAGGED_ERROR',
                message: 'Failed to get flagged transactions'
            }
        });
    }
});

export default router;

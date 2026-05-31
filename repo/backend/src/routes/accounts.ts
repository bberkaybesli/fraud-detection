import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { accountService } from '../services/account-service';
import { validateAccount } from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /accounts
 * Create a new account
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { error, value } = validateAccount(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const account = await accountService.createAccount({
            account_id: value.account_id,
            tc_kimlik: value.tc_kimlik,
            name: value.owner_name,
            account_type: value.bank
        });

        return res.status(201).json({
            success: true,
            data: account
        });
    } catch (error) {
        logger.error('Failed to create account', { error, body: req.body });
        return res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ACCOUNT_ERROR',
                message: 'Failed to create account'
            }
        });
    }
});

/**
 * GET /accounts/:accountId
 * Get account details
 */
router.get('/:accountId', authenticate, async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;

        const account = await accountService.getAccount(accountId);

        if (!account) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ACCOUNT_NOT_FOUND',
                    message: 'Account not found'
                }
            });
        }

        return res.json({
            success: true,
            data: account
        });
    } catch (error) {
        logger.error('Failed to get account', { error, accountId: req.params.accountId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_ACCOUNT_ERROR',
                message: 'Failed to get account'
            }
        });
    }
});

/**
 * GET /accounts/:accountId/stats
 * Get account statistics
 */
router.get('/:accountId/stats', authenticate, async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;

        const stats = await accountService.getAccountStats(accountId);

        return res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Failed to get account stats', { error, accountId: req.params.accountId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_STATS_ERROR',
                message: 'Failed to get account statistics'
            }
        });
    }
});

/**
 * GET /accounts/:accountId/transactions
 * Get account transaction history
 */
router.get('/:accountId/transactions', authenticate, async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const transactions = await accountService.getTransactionHistory(accountId, limit);

        return res.json({
            success: true,
            data: {
                account_id: accountId,
                transactions,
                count: transactions.length
            }
        });
    } catch (error) {
        logger.error('Failed to get transaction history', { error, accountId: req.params.accountId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_HISTORY_ERROR',
                message: 'Failed to get transaction history'
            }
        });
    }
});

/**
 * GET /accounts
 * List all accounts
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const skip = parseInt(req.query.skip as string) || 0;
        const limit = parseInt(req.query.limit as string) || 50;
        const highRisk = req.query.high_risk === 'true';

        const accounts = highRisk
            ? await accountService.getHighRiskAccounts(70, limit)
            : await accountService.listAccounts(skip, limit);

        return res.json({
            success: true,
            data: {
                accounts,
                count: accounts.length,
                skip,
                limit
            }
        });
    } catch (error) {
        logger.error('Failed to list accounts', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'LIST_ACCOUNTS_ERROR',
                message: 'Failed to list accounts'
            }
        });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { fraudService } from '../services/fraud-service';
import { transactionService } from '../services/transaction-service';
import { validateTransactionCheck } from '../utils/validation';
import { logger } from '../utils/logger';
import { Transaction } from '../models/types';

const router = Router();

/**
 * POST /transactions/check
 * Check a transaction for fraud in real-time
 */
router.post('/check', async (req: Request, res: Response) => {
    try {
        // Validate input
        const { error, value } = validateTransactionCheck(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        // Create transaction object
        const transaction: Transaction = {
            tx_id: value.tx_id,
            sender: value.sender,
            recipient: value.recipient,
            amount: value.amount,
            currency: value.currency || 'TRY',
            timestamp: new Date(),
            channel: value.channel || 'EFT',
            description: value.description,
            ip_address: value.ip_address || req.ip,
            device_id: value.device_id,
            flagged: false
        };

        // Check for fraud
        const decision = await fraudService.checkTransaction(transaction);

        // Return decision
        return res.json({
            success: true,
            data: {
                tx_id: transaction.tx_id,
                decision: decision.decision,
                fraud_score: decision.fraud_score,
                reasons: decision.reasons,
                processing_time_ms: decision.processing_time_ms,
                timestamp: decision.timestamp
            }
        });
    } catch (error) {
        logger.error('Transaction check failed', { error, body: req.body });
        return res.status(500).json({
            success: false,
            error: {
                code: 'TRANSACTION_CHECK_ERROR',
                message: 'Failed to check transaction'
            }
        });
    }
});

/**
 * GET /transactions/:txId
 * Get transaction details
 */
router.get('/:txId', authenticate, async (req: Request, res: Response) => {
    try {
        const { txId } = req.params;

        const transaction = await transactionService.getTransaction(txId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Transaction not found'
                }
            });
        }

        return res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        logger.error('Failed to get transaction', { error, txId: req.params.txId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_TRANSACTION_ERROR',
                message: 'Failed to get transaction'
            }
        });
    }
});

/**
 * GET /transactions/:txId/explanation
 * Get fraud explanation for a transaction
 */
router.get('/:txId/explanation', authenticate, async (req: Request, res: Response) => {
    try {
        const { txId } = req.params;

        const explanation = await fraudService.getExplanation(txId);

        if (!explanation) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'EXPLANATION_NOT_FOUND',
                    message: 'Fraud explanation not found'
                }
            });
        }

        return res.json({
            success: true,
            data: explanation
        });
    } catch (error) {
        logger.error('Failed to get explanation', { error, txId: req.params.txId });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_EXPLANATION_ERROR',
                message: 'Failed to get fraud explanation'
            }
        });
    }
});

/**
 * GET /transactions
 * Get recent transactions
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const flaggedOnly = req.query.flagged === 'true';

        const transactions = flaggedOnly
            ? await transactionService.getFlaggedTransactions(limit)
            : await transactionService.getRecentTransactions(limit);

        return res.json({
            success: true,
            data: {
                transactions,
                count: transactions.length
            }
        });
    } catch (error) {
        logger.error('Failed to get transactions', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_TRANSACTIONS_ERROR',
                message: 'Failed to get transactions'
            }
        });
    }
});

/**
 * GET /transactions/stats
 * Get transaction statistics
 */
router.get('/stats/summary', authenticate, async (req: Request, res: Response) => {
    try {
        const stats = await transactionService.getTransactionStats();

        return res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Failed to get transaction stats', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'GET_STATS_ERROR',
                message: 'Failed to get transaction statistics'
            }
        });
    }
});

export default router;

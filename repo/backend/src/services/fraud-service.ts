import { Transaction, FraudDecision, FraudExplanation } from '../models/types';
import { fraudScorer } from '../engine/fraud-scorer';
import { transactionService } from './transaction-service';
import { accountService } from './account-service';
import { logger } from '../utils/logger';
import { redisConnection } from '../config/redis';

export class FraudService {
    /**
     * Check a transaction for fraud in real-time
     * This is the main entry point for fraud detection
     */
    async checkTransaction(tx: Transaction): Promise<FraudDecision> {
        try {
            // Validate accounts exist
            const [sender, recipient] = await Promise.all([
                accountService.getAccount(tx.sender),
                accountService.getAccount(tx.recipient)
            ]);

            if (!sender) {
                logger.warn('Sender account not found', { tx_id: tx.tx_id, sender: tx.sender });
                return {
                    decision: 'reject',
                    fraud_score: 100,
                    reasons: [{
                        signal: 'unknown_sender',
                        score: 100,
                        detail: 'Sender account does not exist',
                        severity: 'critical'
                    }],
                    timestamp: new Date(),
                    processing_time_ms: 0
                };
            }

            if (!recipient) {
                logger.warn('Recipient account not found', { tx_id: tx.tx_id, recipient: tx.recipient });
                return {
                    decision: 'reject',
                    fraud_score: 100,
                    reasons: [{
                        signal: 'unknown_recipient',
                        score: 100,
                        detail: 'Recipient account does not exist',
                        severity: 'critical'
                    }],
                    timestamp: new Date(),
                    processing_time_ms: 0
                };
            }

            // Run fraud scoring
            const decision = await fraudScorer.scoreTransaction(tx);

            // Record transaction with fraud score
            const txToRecord = {
                ...tx,
                flagged: decision.decision === 'reject'
            };

            await transactionService.recordTransaction(txToRecord);
            await transactionService.updateTransactionFraudScore(
                tx.tx_id,
                decision.fraud_score,
                decision.decision.toUpperCase()
            );

            // Cache the decision
            await redisConnection.cacheExplanation(tx.tx_id, {
                tx_id: tx.tx_id,
                decision: decision.decision,
                fraud_score: decision.fraud_score,
                reasons: decision.reasons,
                timestamp: decision.timestamp
            }, 86400);

            // If rejected or needs review, trigger MASAK reporting
            if (decision.decision === 'reject' && decision.fraud_score >= 80) {
                await this.triggerMasakReport(tx, decision);
            }

            // Publish fraud alert if high risk
            if (decision.fraud_score >= 70) {
                await redisConnection.publishFraudAlert({
                    tx_id: tx.tx_id,
                    sender: tx.sender,
                    recipient: tx.recipient,
                    amount: tx.amount,
                    fraud_score: decision.fraud_score,
                    decision: decision.decision,
                    timestamp: new Date()
                });
            }

            logger.info('Transaction checked', {
                tx_id: tx.tx_id,
                decision: decision.decision,
                fraud_score: decision.fraud_score
            });

            return decision;
        } catch (error) {
            logger.error('Failed to check transaction', { error, tx });
            throw error;
        }
    }

    /**
     * Get fraud explanation for a transaction
     */
    async getExplanation(txId: string): Promise<FraudExplanation | null> {
        try {
            return await fraudScorer.getExplanation(txId);
        } catch (error) {
            logger.error('Failed to get explanation', { error, txId });
            throw error;
        }
    }

    /**
     * Trigger MASAK report for high-risk transaction
     */
    private async triggerMasakReport(tx: Transaction, decision: FraudDecision): Promise<void> {
        try {
            const report = {
                report_id: `MASAK-${tx.tx_id}-${Date.now()}`,
                tx_id: tx.tx_id,
                sender: tx.sender,
                recipient: tx.recipient,
                amount: tx.amount,
                currency: tx.currency,
                reason: decision.reasons.map(r => r.detail).join('; '),
                fraud_score: decision.fraud_score,
                evidence: decision.reasons,
                timestamp: new Date(),
                status: 'pending'
            };

            await redisConnection.pushToMasakQueue(report);

            logger.audit('MASAK report queued', {
                report_id: report.report_id,
                tx_id: tx.tx_id,
                fraud_score: decision.fraud_score
            });
        } catch (error) {
            logger.error('Failed to trigger MASAK report', { error, tx });
            // Don't throw - MASAK reporting failure shouldn't block transaction decision
        }
    }

    /**
     * Batch analyze multiple transactions
     */
    async batchAnalyze(txIds: string[]): Promise<Map<string, FraudExplanation>> {
        const results = new Map<string, FraudExplanation>();

        for (const txId of txIds) {
            try {
                const explanation = await this.getExplanation(txId);
                if (explanation) {
                    results.set(txId, explanation);
                }
            } catch (error) {
                logger.error('Failed to analyze transaction in batch', { error, txId });
            }
        }

        return results;
    }

    /**
     * Get fraud statistics
     */
    async getStats(): Promise<{
        totalTransactions: number;
        acceptedCount: number;
        rejectedCount: number;
        reviewCount: number;
        avgFraudScore: number;
    }> {
        try {
            const stats = await transactionService.getTransactionStats();

            const total = stats.total;
            const avgScore = total > 0
                ? ((stats.rejected * 100) + (stats.review * 50)) / total
                : 0;

            return {
                totalTransactions: total,
                acceptedCount: stats.accepted,
                rejectedCount: stats.rejected,
                reviewCount: stats.review,
                avgFraudScore: Math.round(avgScore)
            };
        } catch (error) {
            logger.error('Failed to get fraud stats', { error });
            throw error;
        }
    }
}

export const fraudService = new FraudService();

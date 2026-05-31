import { neo4jConnection } from '../config/neo4j';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { Transaction } from '../models/types';

export class TransactionService {
    /**
     * Record a transaction in the graph
     */
    async recordTransaction(tx: Transaction): Promise<void> {
        const session = neo4jConnection.getSession();

        try {
            await session.run(
                `
        MATCH (sender:Account {account_id: $sender})
        MATCH (recipient:Account {account_id: $recipient})
        CREATE (sender)-[r:TRANSFERRED_TO {
          tx_id: $tx_id,
          amount: $amount,
          currency: $currency,
          timestamp: datetime($timestamp),
          channel: $channel,
          description: $description,
          ip_address: $ip_address,
          device_id: $device_id,
          fraud_score: 0.0,
          status: $status
        }]->(recipient)
        RETURN r
        `,
                {
                    sender: tx.sender,
                    recipient: tx.recipient,
                    tx_id: tx.tx_id,
                    amount: tx.amount,
                    currency: tx.currency,
                    timestamp: tx.timestamp.toISOString(),
                    channel: tx.channel,
                    description: tx.description || null,
                    ip_address: tx.ip_address || null,
                    device_id: tx.device_id || null,
                    status: tx.flagged ? 'REJECTED' : 'ACCEPTED'
                }
            );

            logger.info('Transaction recorded', {
                tx_id: tx.tx_id,
                sender: tx.sender,
                recipient: tx.recipient,
                amount: tx.amount
            });

            // Update daily statistics
            await this.updateDailyStats(tx);
        } catch (error) {
            logger.error('Failed to record transaction', { error, tx });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Update transaction fraud score
     */
    async updateTransactionFraudScore(txId: string, fraudScore: number, status: string): Promise<void> {
        const session = neo4jConnection.getSession();

        try {
            await session.run(
                `
        MATCH ()-[r:TRANSFERRED_TO {tx_id: $tx_id}]->()
        SET r.fraud_score = $fraud_score,
            r.status = $status
        `,
                {
                    tx_id: txId,
                    fraud_score: fraudScore,
                    status: status
                }
            );

            logger.info('Transaction fraud score updated', { txId, fraudScore, status });
        } catch (error) {
            logger.error('Failed to update transaction fraud score', { error, txId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get transaction by ID
     */
    async getTransaction(txId: string): Promise<any | null> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account)-[r:TRANSFERRED_TO {tx_id: $tx_id}]->(recipient:Account)
        RETURN sender.account_id as sender,
               recipient.account_id as recipient,
               r.tx_id as tx_id,
               r.amount as amount,
               r.currency as currency,
               r.timestamp as timestamp,
               r.channel as channel,
               r.description as description,
               r.fraud_score as fraud_score,
               r.status as status
        `,
                { tx_id: txId }
            );

            if (result.records.length === 0) {
                return null;
            }

            const record = result.records[0];
            return {
                tx_id: record.get('tx_id'),
                sender: record.get('sender'),
                recipient: record.get('recipient'),
                amount: record.get('amount'),
                currency: record.get('currency'),
                timestamp: record.get('timestamp').toString(),
                channel: record.get('channel'),
                description: record.get('description'),
                fraud_score: record.get('fraud_score'),
                status: record.get('status')
            };
        } catch (error) {
            logger.error('Failed to get transaction', { error, txId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get recent transactions
     */
    async getRecentTransactions(limit: number = 100): Promise<any[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account)-[r:TRANSFERRED_TO]->(recipient:Account)
        RETURN sender.account_id as sender,
               recipient.account_id as recipient,
               r.tx_id as tx_id,
               r.amount as amount,
               r.currency as currency,
               r.timestamp as timestamp,
               r.channel as channel,
               r.fraud_score as fraud_score,
               r.status as status
        ORDER BY r.timestamp DESC
        LIMIT toInteger($limit)
        `,
                { limit }
            );

            return result.records.map((record: any) => ({
                tx_id: record.get('tx_id'),
                sender: record.get('sender'),
                recipient: record.get('recipient'),
                amount: record.get('amount'),
                currency: record.get('currency'),
                timestamp: record.get('timestamp').toString(),
                channel: record.get('channel'),
                fraud_score: record.get('fraud_score'),
                status: record.get('status')
            }));
        } catch (error) {
            logger.error('Failed to get recent transactions', { error });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get flagged transactions
     */
    async getFlaggedTransactions(limit: number = 100): Promise<any[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account)-[r:TRANSFERRED_TO]->(recipient:Account)
        WHERE r.status IN ['REJECTED', 'REVIEW']
        RETURN sender.account_id as sender,
               recipient.account_id as recipient,
               r.tx_id as tx_id,
               r.amount as amount,
               r.currency as currency,
               r.timestamp as timestamp,
               r.channel as channel,
               r.fraud_score as fraud_score,
               r.status as status
        ORDER BY r.fraud_score DESC, r.timestamp DESC
        LIMIT toInteger($limit)
        `,
                { limit }
            );

            return result.records.map((record: any) => ({
                tx_id: record.get('tx_id'),
                sender: record.get('sender'),
                recipient: record.get('recipient'),
                amount: record.get('amount'),
                currency: record.get('currency'),
                timestamp: record.get('timestamp').toString(),
                channel: record.get('channel'),
                fraud_score: record.get('fraud_score'),
                status: record.get('status')
            }));
        } catch (error) {
            logger.error('Failed to get flagged transactions', { error });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get transactions in time window for an account
     */
    async getTransactionsInWindow(
        accountId: string,
        windowHours: number = 24
    ): Promise<any[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $account_id})-[r:TRANSFERRED_TO]->()
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
        RETURN r.tx_id as tx_id,
               r.amount as amount,
               r.timestamp as timestamp,
               r.status as status
        ORDER BY r.timestamp DESC
        `,
                { account_id: accountId, window_hours: windowHours }
            );

            return result.records.map((record: any) => ({
                tx_id: record.get('tx_id'),
                amount: record.get('amount'),
                timestamp: record.get('timestamp').toString(),
                status: record.get('status')
            }));
        } catch (error) {
            logger.error('Failed to get transactions in window', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Count transactions from account in time window
     */
    async countTransactionsInWindow(
        accountId: string,
        windowHours: number = 24
    ): Promise<number> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $account_id})-[r:TRANSFERRED_TO]->()
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
        RETURN count(r) as count
        `,
                { account_id: accountId, window_hours: windowHours }
            );

            return result.records[0].get('count').toNumber();
        } catch (error) {
            logger.error('Failed to count transactions', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get total amount sent in time window
     */
    async getTotalAmountInWindow(
        accountId: string,
        windowHours: number = 24
    ): Promise<number> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $account_id})-[r:TRANSFERRED_TO]->()
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
        RETURN coalesce(sum(r.amount), 0) as total
        `,
                { account_id: accountId, window_hours: windowHours }
            );

            return result.records[0].get('total');
        } catch (error) {
            logger.error('Failed to get total amount', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Update daily statistics in Redis
     */
    private async updateDailyStats(tx: Transaction): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const statsKey = `stats:daily:${today}`;

            await redisConnection.incrementStat(statsKey, 'total_transactions', 1);
            await redisConnection.incrementStat(statsKey, 'total_amount', tx.amount);

            if (tx.flagged) {
                await redisConnection.incrementStat(statsKey, 'rejected_transactions', 1);
            } else {
                await redisConnection.incrementStat(statsKey, 'accepted_transactions', 1);
            }
        } catch (error) {
            logger.error('Failed to update daily stats', { error });
            // Don't throw - stats update failure shouldn't block transaction
        }
    }

    /**
     * Check rate limit for account
     */
    async checkRateLimit(accountId: string): Promise<{ allowed: boolean; count: number }> {
        return await redisConnection.checkRateLimit(accountId);
    }

    /**
     * Get transaction statistics
     */
    async getTransactionStats(): Promise<{
        total: number;
        accepted: number;
        rejected: number;
        review: number;
        totalAmount: number;
    }> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH ()-[r:TRANSFERRED_TO]->()
        RETURN count(r) as total,
               sum(CASE WHEN r.status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted,
               sum(CASE WHEN r.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
               sum(CASE WHEN r.status = 'REVIEW' THEN 1 ELSE 0 END) as review,
               sum(r.amount) as total_amount
        `
            );

            const record = result.records[0];
            return {
                total: record.get('total').toNumber(),
                accepted: record.get('accepted').toNumber(),
                rejected: record.get('rejected').toNumber(),
                review: record.get('review').toNumber(),
                totalAmount: record.get('total_amount')
            };
        } catch (error) {
            logger.error('Failed to get transaction stats', { error });
            throw error;
        } finally {
            await session.close();
        }
    }
}

export const transactionService = new TransactionService();

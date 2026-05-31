import { neo4jConnection } from '../config/neo4j';
import { logger } from '../utils/logger';
import { SmurfingPattern } from '../models/types';

export class SmurfingDetector {
    /**
     * Detect smurfing pattern for an account
     * Smurfing = splitting large amounts into many small transactions to avoid detection
     */
    async detectSmurfing(
        accountId: string,
        windowHours: number = 24,
        minTransactions: number = 10,
        maxAvgAmount: number = 10000
    ): Promise<SmurfingPattern | null> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account {account_id: $account_id})-[r:TRANSFERRED_TO]->(recipient:Account)
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
        WITH sender,
             count(r) as tx_count,
             sum(r.amount) as total_amount,
             avg(r.amount) as avg_amount,
             collect(DISTINCT recipient.account_id) as recipients,
             collect({amount: r.amount, timestamp: r.timestamp}) as transactions
        WHERE tx_count >= $min_transactions
          AND avg_amount <= $max_avg_amount
        RETURN 
          sender.account_id as account,
          tx_count,
          total_amount,
          avg_amount,
          recipients,
          transactions
        `,
                {
                    account_id: accountId,
                    window_hours: windowHours,
                    min_transactions: minTransactions,
                    max_avg_amount: maxAvgAmount
                }
            );

            if (result.records.length === 0) {
                return null;
            }

            const record = result.records[0];
            const txCount = record.get('tx_count').toNumber();
            const totalAmount = record.get('total_amount');
            const avgAmount = record.get('avg_amount');
            const recipients = record.get('recipients');

            // Determine pattern type
            let patternType: 'split_avoidance' | 'rapid_distribution' | 'structured' = 'structured';

            // Check if amounts are suspiciously consistent (just below threshold)
            const transactions = record.get('transactions');
            const amounts = transactions.map((tx: any) => tx.amount);
            const amountVariance = this.calculateVariance(amounts);

            if (amountVariance < 1000 && avgAmount > 9000 && avgAmount < 10000) {
                patternType = 'split_avoidance'; // Deliberately staying under 10k threshold
            } else if (txCount > 20 && windowHours <= 24) {
                patternType = 'rapid_distribution'; // Many transactions in short time
            }

            const pattern: SmurfingPattern = {
                account: accountId,
                tx_count: txCount,
                total_amount: totalAmount,
                avg_amount: avgAmount,
                time_window_hours: windowHours,
                recipients: recipients,
                pattern_type: patternType
            };

            logger.warn('Smurfing pattern detected', {
                accountId,
                txCount,
                totalAmount,
                patternType
            });

            return pattern;
        } catch (error) {
            logger.error('Failed to detect smurfing', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Find all accounts with smurfing patterns
     */
    async findAllSmurfingPatterns(
        windowHours: number = 24,
        minTransactions: number = 10,
        maxAvgAmount: number = 10000,
        limit: number = 100
    ): Promise<SmurfingPattern[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account)-[r:TRANSFERRED_TO]->(recipient:Account)
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
        WITH sender,
             count(r) as tx_count,
             sum(r.amount) as total_amount,
             avg(r.amount) as avg_amount,
             collect(DISTINCT recipient.account_id) as recipients
        WHERE tx_count >= $min_transactions
          AND avg_amount <= $max_avg_amount
        RETURN 
          sender.account_id as account,
          tx_count,
          total_amount,
          avg_amount,
          recipients
        ORDER BY total_amount DESC
        LIMIT toInteger($limit)
        `,
                {
                    window_hours: windowHours,
                    min_transactions: minTransactions,
                    max_avg_amount: maxAvgAmount,
                    limit
                }
            );

            return result.records.map((record: any) => {
                const txCount = record.get('tx_count').toNumber();
                const avgAmount = record.get('avg_amount');

                // Determine pattern type based on characteristics
                let patternType: 'split_avoidance' | 'rapid_distribution' | 'structured' = 'structured';

                if (avgAmount > 9000 && avgAmount < 10000) {
                    patternType = 'split_avoidance';
                } else if (txCount > 20) {
                    patternType = 'rapid_distribution';
                }

                return {
                    account: record.get('account'),
                    tx_count: txCount,
                    total_amount: record.get('total_amount'),
                    avg_amount: avgAmount,
                    time_window_hours: windowHours,
                    recipients: record.get('recipients'),
                    pattern_type: patternType
                };
            });
        } catch (error) {
            logger.error('Failed to find smurfing patterns', { error });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Detect structured transactions (amounts just below reporting threshold)
     */
    async detectStructuredTransactions(
        accountId: string,
        threshold: number = 10000,
        tolerance: number = 500,
        windowHours: number = 24
    ): Promise<{
        detected: boolean;
        count: number;
        totalAmount: number;
        avgAmount: number;
    }> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account {account_id: $account_id})-[r:TRANSFERRED_TO]->()
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
          AND r.amount > $threshold - $tolerance
          AND r.amount < $threshold
        RETURN 
          count(r) as count,
          sum(r.amount) as total_amount,
          avg(r.amount) as avg_amount
        `,
                {
                    account_id: accountId,
                    threshold,
                    tolerance,
                    window_hours: windowHours
                }
            );

            const record = result.records[0];
            const count = record.get('count').toNumber();
            const totalAmount = record.get('total_amount') || 0;
            const avgAmount = record.get('avg_amount') || 0;

            return {
                detected: count >= 3, // 3 or more structured transactions
                count,
                totalAmount,
                avgAmount
            };
        } catch (error) {
            logger.error('Failed to detect structured transactions', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Detect rapid distribution pattern (one account sending to many)
     */
    async detectRapidDistribution(
        accountId: string,
        windowHours: number = 1,
        minRecipients: number = 5
    ): Promise<{
        detected: boolean;
        recipientCount: number;
        transactionCount: number;
        totalAmount: number;
    }> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (sender:Account {account_id: $account_id})-[r:TRANSFERRED_TO]->(recipient:Account)
        WHERE r.timestamp > datetime() - duration({hours: $window_hours})
        RETURN 
          count(DISTINCT recipient) as recipient_count,
          count(r) as tx_count,
          sum(r.amount) as total_amount
        `,
                {
                    account_id: accountId,
                    window_hours: windowHours
                }
            );

            const record = result.records[0];
            const recipientCount = record.get('recipient_count').toNumber();
            const txCount = record.get('tx_count').toNumber();
            const totalAmount = record.get('total_amount') || 0;

            return {
                detected: recipientCount >= minRecipients,
                recipientCount,
                transactionCount: txCount,
                totalAmount
            };
        } catch (error) {
            logger.error('Failed to detect rapid distribution', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Calculate smurfing risk score
     */
    calculateSmurfingRiskScore(pattern: SmurfingPattern): number {
        let score = 0;

        // Base score for pattern detection
        score += 30;

        // Transaction count factor
        if (pattern.tx_count > 50) {
            score += 30;
        } else if (pattern.tx_count > 25) {
            score += 20;
        } else if (pattern.tx_count > 10) {
            score += 15;
        }

        // Total amount factor
        if (pattern.total_amount > 500000) {
            score += 25;
        } else if (pattern.total_amount > 250000) {
            score += 20;
        } else if (pattern.total_amount > 100000) {
            score += 15;
        }

        // Pattern type severity
        if (pattern.pattern_type === 'split_avoidance') {
            score += 20; // Most suspicious
        } else if (pattern.pattern_type === 'rapid_distribution') {
            score += 15;
        } else {
            score += 10;
        }

        // Recipient diversity (more recipients = more suspicious)
        if (pattern.recipients.length > 20) {
            score += 15;
        } else if (pattern.recipients.length > 10) {
            score += 10;
        } else if (pattern.recipients.length > 5) {
            score += 5;
        }

        return Math.min(score, 100);
    }

    /**
     * Calculate variance of amounts
     */
    private calculateVariance(amounts: number[]): number {
        if (amounts.length === 0) return 0;

        const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const squaredDiffs = amounts.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / amounts.length;

        return variance;
    }

    /**
     * Get smurfing statistics
     */
    async getSmurfingStats(): Promise<{
        totalPatterns: number;
        byType: Record<string, number>;
        totalAmount: number;
        avgTransactionsPerPattern: number;
    }> {
        const patterns = await this.findAllSmurfingPatterns(24, 10, 10000, 1000);

        const byType: Record<string, number> = {
            split_avoidance: 0,
            rapid_distribution: 0,
            structured: 0
        };

        let totalAmount = 0;
        let totalTransactions = 0;

        patterns.forEach(pattern => {
            byType[pattern.pattern_type]++;
            totalAmount += pattern.total_amount;
            totalTransactions += pattern.tx_count;
        });

        return {
            totalPatterns: patterns.length,
            byType,
            totalAmount,
            avgTransactionsPerPattern: patterns.length > 0 ? totalTransactions / patterns.length : 0
        };
    }
}

export const smurfingDetector = new SmurfingDetector();

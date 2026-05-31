import { neo4jConnection } from '../config/neo4j';
import { logger } from '../utils/logger';
import { CycleInfo } from '../models/types';

export class CycleDetector {
    /**
     * Detect if adding this transaction would create a cycle
     * Returns cycle information if found
     */
    async detectCycle(
        sender: string,
        recipient: string,
        amount: number,
        maxDepth: number = 4
    ): Promise<CycleInfo | null> {
        const session = neo4jConnection.getSession();

        try {
            // Check if there's already a path from recipient back to sender
            const result = await session.run(
                `
        MATCH (sender:Account {account_id: $sender})
        MATCH (recipient:Account {account_id: $recipient})
        MATCH path = (recipient)-[:TRANSFERRED_TO*1..${maxDepth}]->(sender)
        WITH path, relationships(path) as rels
        WHERE all(r in rels WHERE r.timestamp > datetime() - duration({hours: 168}))
        RETURN 
          [node in nodes(path) | node.account_id] as accounts,
          [r in rels | {
            from: startNode(r).account_id,
            to: endNode(r).account_id,
            amount: r.amount,
            timestamp: r.timestamp
          }] as transactions,
          reduce(total = 0, r in rels | total + r.amount) as total_amount,
          duration.inSeconds(
            rels[0].timestamp,
            rels[size(rels)-1].timestamp
          ).hours as duration_hours
        ORDER BY length(path) ASC
        LIMIT 1
        `,
                { sender, recipient }
            );

            if (result.records.length === 0) {
                return null;
            }

            const record = result.records[0];
            const accounts = record.get('accounts');
            const transactions = record.get('transactions');
            const totalAmount = record.get('total_amount');
            const durationHours = record.get('duration_hours');

            // Add the current transaction to complete the cycle
            const cycleTransactions = [
                ...transactions.map((tx: any) => ({
                    from: tx.from,
                    to: tx.to,
                    amount: tx.amount,
                    timestamp: new Date(tx.timestamp.toString())
                })),
                {
                    from: sender,
                    to: recipient,
                    amount: amount,
                    timestamp: new Date()
                }
            ];

            const cycleInfo: CycleInfo = {
                path: [...accounts, recipient], // Complete the cycle
                length: accounts.length,
                total_amount: totalAmount + amount,
                duration_hours: durationHours,
                transactions: cycleTransactions
            };

            logger.warn('Cycle detected', {
                sender,
                recipient,
                cycleLength: cycleInfo.length,
                totalAmount: cycleInfo.total_amount
            });

            return cycleInfo;
        } catch (error) {
            logger.error('Failed to detect cycle', { error, sender, recipient });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Find all existing cycles in the graph
     */
    async findAllCycles(
        minLength: number = 3,
        maxLength: number = 5,
        limit: number = 100
    ): Promise<CycleInfo[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH path = (a:Account)-[:TRANSFERRED_TO*${minLength}..${maxLength}]->(a)
        WITH path, relationships(path) as rels
        WHERE all(r in rels WHERE r.timestamp > datetime() - duration({hours: 168}))
        WITH path, rels,
          [node in nodes(path) | node.account_id] as accounts,
          reduce(total = 0, r in rels | total + r.amount) as total_amount,
          duration.inSeconds(
            rels[0].timestamp,
            rels[size(rels)-1].timestamp
          ).hours as duration_hours
        RETURN DISTINCT
          accounts,
          [r in rels | {
            from: startNode(r).account_id,
            to: endNode(r).account_id,
            amount: r.amount,
            timestamp: r.timestamp
          }] as transactions,
          total_amount,
          duration_hours,
          size(accounts) as cycle_length
        ORDER BY total_amount DESC
        LIMIT toInteger($limit)
        `,
                { limit }
            );

            return result.records.map((record: any) => {
                const accounts = record.get('accounts');
                const transactions = record.get('transactions');

                return {
                    path: accounts,
                    length: record.get('cycle_length'),
                    total_amount: record.get('total_amount'),
                    duration_hours: record.get('duration_hours'),
                    transactions: transactions.map((tx: any) => ({
                        from: tx.from,
                        to: tx.to,
                        amount: tx.amount,
                        timestamp: new Date(tx.timestamp.toString())
                    }))
                };
            });
        } catch (error) {
            logger.error('Failed to find all cycles', { error });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Find cycles involving a specific account
     */
    async findCyclesForAccount(
        accountId: string,
        maxLength: number = 5,
        limit: number = 50
    ): Promise<CycleInfo[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH path = (a:Account {account_id: $account_id})-[:TRANSFERRED_TO*2..${maxLength}]->(a)
        WITH path, relationships(path) as rels
        WHERE all(r in rels WHERE r.timestamp > datetime() - duration({hours: 168}))
        WITH path, rels,
          [node in nodes(path) | node.account_id] as accounts,
          reduce(total = 0, r in rels | total + r.amount) as total_amount,
          duration.inSeconds(
            rels[0].timestamp,
            rels[size(rels)-1].timestamp
          ).hours as duration_hours
        RETURN 
          accounts,
          [r in rels | {
            from: startNode(r).account_id,
            to: endNode(r).account_id,
            amount: r.amount,
            timestamp: r.timestamp
          }] as transactions,
          total_amount,
          duration_hours,
          size(accounts) as cycle_length
        ORDER BY total_amount DESC
        LIMIT toInteger($limit)
        `,
                { account_id: accountId, limit }
            );

            return result.records.map((record: any) => {
                const accounts = record.get('accounts');
                const transactions = record.get('transactions');

                return {
                    path: accounts,
                    length: record.get('cycle_length'),
                    total_amount: record.get('total_amount'),
                    duration_hours: record.get('duration_hours'),
                    transactions: transactions.map((tx: any) => ({
                        from: tx.from,
                        to: tx.to,
                        amount: tx.amount,
                        timestamp: new Date(tx.timestamp.toString())
                    }))
                };
            });
        } catch (error) {
            logger.error('Failed to find cycles for account', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Detect rapid round-trip transactions (A->B->A within short time)
     */
    async detectRapidRoundTrip(
        sender: string,
        recipient: string,
        maxHours: number = 24
    ): Promise<boolean> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $sender})-[r1:TRANSFERRED_TO]->(b:Account {account_id: $recipient})
        MATCH (b)-[r2:TRANSFERRED_TO]->(a)
        WHERE r1.timestamp > datetime() - duration({hours: $max_hours})
          AND r2.timestamp > r1.timestamp
          AND r2.timestamp < r1.timestamp + duration({hours: $max_hours})
        RETURN count(*) as count
        `,
                { sender, recipient, max_hours: maxHours }
            );

            const count = result.records[0].get('count').toNumber();
            return count > 0;
        } catch (error) {
            logger.error('Failed to detect rapid round trip', { error, sender, recipient });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Calculate cycle risk score
     */
    calculateCycleRiskScore(cycle: CycleInfo): number {
        let score = 0;

        // Base score for cycle existence
        score += 40;

        // Length penalty (shorter cycles are more suspicious)
        if (cycle.length === 2) {
            score += 30; // Direct round-trip
        } else if (cycle.length === 3) {
            score += 25;
        } else if (cycle.length === 4) {
            score += 15;
        } else {
            score += 10;
        }

        // Amount factor (higher amounts = higher risk)
        if (cycle.total_amount > 100000) {
            score += 20;
        } else if (cycle.total_amount > 50000) {
            score += 15;
        } else if (cycle.total_amount > 10000) {
            score += 10;
        }

        // Time factor (faster cycles = higher risk)
        if (cycle.duration_hours < 1) {
            score += 20;
        } else if (cycle.duration_hours < 24) {
            score += 15;
        } else if (cycle.duration_hours < 72) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    /**
     * Get cycle statistics
     */
    async getCycleStats(): Promise<{
        totalCycles: number;
        cyclesByLength: Record<number, number>;
        avgCycleAmount: number;
        maxCycleAmount: number;
    }> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH path = (a:Account)-[:TRANSFERRED_TO*2..5]->(a)
        WITH path, relationships(path) as rels
        WHERE all(r in rels WHERE r.timestamp > datetime() - duration({hours: 168}))
        WITH 
          size(rels) as cycle_length,
          reduce(total = 0, r in rels | total + r.amount) as cycle_amount
        RETURN 
          count(*) as total_cycles,
          cycle_length,
          count(*) as count_by_length,
          avg(cycle_amount) as avg_amount,
          max(cycle_amount) as max_amount
        ORDER BY cycle_length
        `
            );

            const cyclesByLength: Record<number, number> = {};
            let totalCycles = 0;
            let avgAmount = 0;
            let maxAmount = 0;

            result.records.forEach((record: any) => {
                const length = record.get('cycle_length');
                const count = record.get('count_by_length').toNumber();
                cyclesByLength[length] = count;
                totalCycles += count;
                avgAmount = Math.max(avgAmount, record.get('avg_amount'));
                maxAmount = Math.max(maxAmount, record.get('max_amount'));
            });

            return {
                totalCycles,
                cyclesByLength,
                avgCycleAmount: avgAmount,
                maxCycleAmount: maxAmount
            };
        } catch (error) {
            logger.error('Failed to get cycle stats', { error });
            throw error;
        } finally {
            await session.close();
        }
    }
}

export const cycleDetector = new CycleDetector();

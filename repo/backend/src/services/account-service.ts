import { neo4jConnection } from '../config/neo4j';
import { redisConnection } from '../config/redis';
import { hashTcKimlik } from '../utils/hash';
import { logger } from '../utils/logger';
import { Account, AccountCreateInput, AccountUpdateInput } from '../models/types';

export class AccountService {
    /**
     * Create a new account
     */
    async createAccount(input: AccountCreateInput): Promise<Account> {
        const session = neo4jConnection.getSession();

        try {
            const hashedTCKimlik = hashTcKimlik(input.tc_kimlik);

            const result = await session.run(
                `
        CREATE (a:Account {
          account_id: $account_id,
          tc_kimlik_hash: $tc_kimlik_hash,
          name: $name,
          account_type: $account_type,
          created_at: datetime(),
          fraud_score: 0.0,
          risk_category: 'LOW',
          pagerank: 0.0,
          community_id: null
        })
        RETURN a
        `,
                {
                    account_id: input.account_id,
                    tc_kimlik_hash: hashedTCKimlik,
                    name: input.name,
                    account_type: input.account_type
                }
            );

            const node = result.records[0].get('a');
            const account: Account = {
                account_id: node.properties.account_id,
                tc_kimlik_hash: node.properties.tc_kimlik_hash,
                name: node.properties.name,
                account_type: node.properties.account_type,
                created_at: node.properties.created_at.toString(),
                fraud_score: node.properties.fraud_score,
                risk_category: node.properties.risk_category,
                pagerank: node.properties.pagerank,
                community_id: node.properties.community_id
            };

            logger.info('Account created', { account_id: account.account_id });

            return account;
        } catch (error) {
            logger.error('Failed to create account', { error, input });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get account by ID
     */
    async getAccount(accountId: string): Promise<Account | null> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $account_id})
        RETURN a
        `,
                { account_id: accountId }
            );

            if (result.records.length === 0) {
                return null;
            }

            const node = result.records[0].get('a');
            return {
                account_id: node.properties.account_id,
                tc_kimlik_hash: node.properties.tc_kimlik_hash,
                name: node.properties.name,
                account_type: node.properties.account_type,
                created_at: node.properties.created_at.toString(),
                fraud_score: node.properties.fraud_score,
                risk_category: node.properties.risk_category,
                pagerank: node.properties.pagerank,
                community_id: node.properties.community_id
            };
        } catch (error) {
            logger.error('Failed to get account', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Update account fraud score
     */
    async updateFraudScore(accountId: string, fraudScore: number, riskCategory: string): Promise<void> {
        const session = neo4jConnection.getSession();

        try {
            await session.run(
                `
        MATCH (a:Account {account_id: $account_id})
        SET a.fraud_score = $fraud_score,
            a.risk_category = $risk_category
        `,
                {
                    account_id: accountId,
                    fraud_score: fraudScore,
                    risk_category: riskCategory
                }
            );

            // Cache fraud score in Redis
            await redisConnection.cacheFraudScore(accountId, fraudScore, 300);

            logger.info('Fraud score updated', { accountId, fraudScore, riskCategory });
        } catch (error) {
            logger.error('Failed to update fraud score', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get accounts with high fraud scores
     */
    async getHighRiskAccounts(minScore: number = 70, limit: number = 100): Promise<Account[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account)
        WHERE a.fraud_score >= $min_score
        RETURN a
        ORDER BY a.fraud_score DESC
        LIMIT toInteger($limit)
        `,
                { min_score: minScore, limit }
            );

            return result.records.map((record: any) => {
                const node = record.get('a');
                return {
                    account_id: node.properties.account_id,
                    tc_kimlik_hash: node.properties.tc_kimlik_hash,
                    name: node.properties.name,
                    account_type: node.properties.account_type,
                    created_at: node.properties.created_at.toString(),
                    fraud_score: node.properties.fraud_score,
                    risk_category: node.properties.risk_category,
                    pagerank: node.properties.pagerank,
                    community_id: node.properties.community_id
                };
            });
        } catch (error) {
            logger.error('Failed to get high risk accounts', { error });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * List all accounts with pagination
     */
    async listAccounts(skip: number = 0, limit: number = 50): Promise<Account[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account)
        RETURN a
        ORDER BY a.created_at DESC
        SKIP toInteger($skip)
        LIMIT toInteger($limit)
        `,
                { skip, limit }
            );

            return result.records.map((record: any) => {
                const node = record.get('a');
                return {
                    account_id: node.properties.account_id,
                    tc_kimlik_hash: node.properties.tc_kimlik_hash,
                    name: node.properties.name,
                    account_type: node.properties.account_type,
                    created_at: node.properties.created_at.toString(),
                    fraud_score: node.properties.fraud_score,
                    risk_category: node.properties.risk_category,
                    pagerank: node.properties.pagerank,
                    community_id: node.properties.community_id
                };
            });
        } catch (error) {
            logger.error('Failed to list accounts', { error });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get account statistics
     */
    async getAccountStats(accountId: string): Promise<{
        totalSent: number;
        totalReceived: number;
        transactionCount: number;
        uniqueCounterparties: number;
    }> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $account_id})
        OPTIONAL MATCH (a)-[sent:TRANSFERRED_TO]->()
        OPTIONAL MATCH ()-[received:TRANSFERRED_TO]->(a)
        WITH a, 
             coalesce(sum(sent.amount), 0) as total_sent,
             coalesce(sum(received.amount), 0) as total_received,
             count(DISTINCT sent) + count(DISTINCT received) as tx_count
        OPTIONAL MATCH (a)-[:TRANSFERRED_TO]-(counterparty:Account)
        RETURN total_sent, total_received, tx_count, count(DISTINCT counterparty) as unique_counterparties
        `,
                { account_id: accountId }
            );

            if (result.records.length === 0) {
                return {
                    totalSent: 0,
                    totalReceived: 0,
                    transactionCount: 0,
                    uniqueCounterparties: 0
                };
            }

            const record = result.records[0];
            return {
                totalSent: record.get('total_sent'),
                totalReceived: record.get('total_received'),
                transactionCount: record.get('tx_count'),
                uniqueCounterparties: record.get('unique_counterparties')
            };
        } catch (error) {
            logger.error('Failed to get account stats', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Check if account is blacklisted
     */
    async isBlacklisted(accountId: string): Promise<boolean> {
        try {
            return await redisConnection.isBlacklisted('accounts', accountId);
        } catch (error) {
            logger.error('Failed to check blacklist', { error, accountId });
            throw error;
        }
    }

    /**
     * Get account transaction history
     */
    async getTransactionHistory(accountId: string, limit: number = 50): Promise<any[]> {
        const session = neo4jConnection.getSession();

        try {
            const result = await session.run(
                `
        MATCH (a:Account {account_id: $account_id})
        OPTIONAL MATCH (a)-[sent:TRANSFERRED_TO]->(recipient:Account)
        OPTIONAL MATCH (sender:Account)-[received:TRANSFERRED_TO]->(a)
        WITH a, 
             collect({
               type: 'SENT',
               tx_id: sent.tx_id,
               amount: sent.amount,
               timestamp: sent.timestamp,
               counterparty: recipient.account_id,
               fraud_score: sent.fraud_score,
               status: sent.status
             }) as sent_txs,
             collect({
               type: 'RECEIVED',
               tx_id: received.tx_id,
               amount: received.amount,
               timestamp: received.timestamp,
               counterparty: sender.account_id,
               fraud_score: received.fraud_score,
               status: received.status
             }) as received_txs
        UNWIND (sent_txs + received_txs) as tx
        WITH tx WHERE tx.tx_id IS NOT NULL
        RETURN tx
        ORDER BY tx.timestamp DESC
        LIMIT toInteger($limit)
        `,
                { account_id: accountId, limit }
            );

            return result.records.map((record: any) => record.get('tx'));
        } catch (error) {
            logger.error('Failed to get transaction history', { error, accountId });
            throw error;
        } finally {
            await session.close();
        }
    }
}

export const accountService = new AccountService();

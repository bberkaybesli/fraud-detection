import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisConnection {
    private client: RedisClientType | null = null;

    async connect(): Promise<void> {
        try {
            this.client = createClient({
                url: config.redis.url,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > config.redis.maxRetries) {
                            logger.error('Redis max retries exceeded');
                            return new Error('Redis max retries exceeded');
                        }
                        return config.redis.retryDelay;
                    },
                },
            });

            this.client.on('error', (err) => {
                logger.error('Redis client error:', err);
            });

            this.client.on('connect', () => {
                logger.info('Redis client connecting...');
            });

            this.client.on('ready', () => {
                logger.info('Redis client ready');
            });

            this.client.on('reconnecting', () => {
                logger.warn('Redis client reconnecting...');
            });

            await this.client.connect();
            logger.info('Redis connection established successfully');
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    getClient(): RedisClientType {
        if (!this.client) {
            throw new Error('Redis client not initialized. Call connect() first.');
        }
        return this.client;
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            logger.info('Redis connection closed');
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.client) {
                return false;
            }
            const pong = await this.client.ping();
            return pong === 'PONG';
        } catch (error) {
            logger.error('Redis health check failed:', error);
            return false;
        }
    }

    // Blacklist operations
    async addToBlacklist(type: 'accounts' | 'ips' | 'devices', value: string): Promise<void> {
        const key = `blacklist:${type}`;
        await this.getClient().sAdd(key, value);
        logger.info(`Added ${value} to ${key}`);
    }

    async removeFromBlacklist(type: 'accounts' | 'ips' | 'devices', value: string): Promise<void> {
        const key = `blacklist:${type}`;
        await this.getClient().sRem(key, value);
        logger.info(`Removed ${value} from ${key}`);
    }

    async isBlacklisted(type: 'accounts' | 'ips' | 'devices', value: string): Promise<boolean> {
        const key = `blacklist:${type}`;
        return await this.getClient().sIsMember(key, value);
    }

    async getBlacklist(type: 'accounts' | 'ips' | 'devices'): Promise<string[]> {
        const key = `blacklist:${type}`;
        return await this.getClient().sMembers(key);
    }

    // Whitelist operations
    async addToWhitelist(type: 'accounts', value: string): Promise<void> {
        const key = `whitelist:${type}`;
        await this.getClient().sAdd(key, value);
        logger.info(`Added ${value} to ${key}`);
    }

    async isWhitelisted(type: 'accounts', value: string): Promise<boolean> {
        const key = `whitelist:${type}`;
        return await this.getClient().sIsMember(key, value);
    }

    // Rate limiting
    async checkRateLimit(accountId: string): Promise<{ allowed: boolean; count: number }> {
        const key = `rate:tx:${accountId}`;
        const count = await this.getClient().incr(key);

        if (count === 1) {
            // First request, set expiry
            await this.getClient().expire(key, config.fraud.rateLimitWindowSeconds);
        }

        const allowed = count <= config.fraud.rateLimitMaxTransactions;
        return { allowed, count };
    }

    // Fraud score cache
    async cacheFraudScore(accountId: string, score: number, ttl: number = 300): Promise<void> {
        const key = `fraud:score:${accountId}`;
        await this.getClient().setEx(key, ttl, score.toString());
    }

    async getCachedFraudScore(accountId: string): Promise<number | null> {
        const key = `fraud:score:${accountId}`;
        const score = await this.getClient().get(key);
        return score ? parseFloat(score) : null;
    }

    // Fraud explanation cache
    async cacheExplanation(txId: string, explanation: any, ttl: number = 86400): Promise<void> {
        const key = `fraud:explanation:${txId}`;
        await this.getClient().setEx(key, ttl, JSON.stringify(explanation));
    }

    async getExplanation(txId: string): Promise<any | null> {
        const key = `fraud:explanation:${txId}`;
        const data = await this.getClient().get(key);
        return data ? JSON.parse(data) : null;
    }

    // MASAK queue operations
    async pushToMasakQueue(report: any): Promise<void> {
        await this.getClient().lPush('masak:queue', JSON.stringify(report));
        logger.info(`Pushed report to MASAK queue: ${report.report_id}`);
    }

    async popFromMasakQueue(timeout: number = 0): Promise<any | null> {
        const result = await this.getClient().brPop('masak:queue', timeout);
        return result ? JSON.parse(result.element) : null;
    }

    async getMasakQueueLength(): Promise<number> {
        return await this.getClient().lLen('masak:queue');
    }

    // Statistics
    async incrementStat(key: string, field: string, value: number = 1): Promise<void> {
        await this.getClient().hIncrBy(key, field, value);
    }

    async getStat(key: string, field: string): Promise<number> {
        const value = await this.getClient().hGet(key, field);
        return value ? parseInt(value, 10) : 0;
    }

    async getAllStats(key: string): Promise<Record<string, string>> {
        return await this.getClient().hGetAll(key);
    }

    // Pub/Sub for fraud alerts
    async publishFraudAlert(alert: any): Promise<void> {
        await this.getClient().publish('fraud:alerts', JSON.stringify(alert));
    }
}

export const redisConnection = new RedisConnection();

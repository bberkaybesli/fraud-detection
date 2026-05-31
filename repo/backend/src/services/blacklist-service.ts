import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

export class BlacklistService {
    /**
     * Add account to blacklist
     */
    async addAccount(accountId: string, reason?: string): Promise<void> {
        try {
            await redisConnection.addToBlacklist('accounts', accountId);

            if (reason) {
                const key = `blacklist:reason:${accountId}`;
                await redisConnection.getClient().set(key, reason);
            }

            logger.audit('Account blacklisted', { accountId, reason });
        } catch (error) {
            logger.error('Failed to add account to blacklist', { error, accountId });
            throw error;
        }
    }

    /**
     * Remove account from blacklist
     */
    async removeAccount(accountId: string): Promise<void> {
        try {
            await redisConnection.removeFromBlacklist('accounts', accountId);

            const key = `blacklist:reason:${accountId}`;
            await redisConnection.getClient().del(key);

            logger.audit('Account removed from blacklist', { accountId });
        } catch (error) {
            logger.error('Failed to remove account from blacklist', { error, accountId });
            throw error;
        }
    }

    /**
     * Check if account is blacklisted
     */
    async isAccountBlacklisted(accountId: string): Promise<boolean> {
        try {
            return await redisConnection.isBlacklisted('accounts', accountId);
        } catch (error) {
            logger.error('Failed to check account blacklist', { error, accountId });
            throw error;
        }
    }

    /**
     * Get all blacklisted accounts
     */
    async getBlacklistedAccounts(): Promise<string[]> {
        try {
            return await redisConnection.getBlacklist('accounts');
        } catch (error) {
            logger.error('Failed to get blacklisted accounts', { error });
            throw error;
        }
    }

    /**
     * Get blacklist reason
     */
    async getBlacklistReason(accountId: string): Promise<string | null> {
        try {
            const key = `blacklist:reason:${accountId}`;
            return await redisConnection.getClient().get(key);
        } catch (error) {
            logger.error('Failed to get blacklist reason', { error, accountId });
            throw error;
        }
    }

    /**
     * Add IP to blacklist
     */
    async addIP(ipAddress: string, reason?: string): Promise<void> {
        try {
            await redisConnection.addToBlacklist('ips', ipAddress);

            if (reason) {
                const key = `blacklist:reason:ip:${ipAddress}`;
                await redisConnection.getClient().set(key, reason);
            }

            logger.audit('IP blacklisted', { ipAddress, reason });
        } catch (error) {
            logger.error('Failed to add IP to blacklist', { error, ipAddress });
            throw error;
        }
    }

    /**
     * Remove IP from blacklist
     */
    async removeIP(ipAddress: string): Promise<void> {
        try {
            await redisConnection.removeFromBlacklist('ips', ipAddress);

            const key = `blacklist:reason:ip:${ipAddress}`;
            await redisConnection.getClient().del(key);

            logger.audit('IP removed from blacklist', { ipAddress });
        } catch (error) {
            logger.error('Failed to remove IP from blacklist', { error, ipAddress });
            throw error;
        }
    }

    /**
     * Check if IP is blacklisted
     */
    async isIPBlacklisted(ipAddress: string): Promise<boolean> {
        try {
            return await redisConnection.isBlacklisted('ips', ipAddress);
        } catch (error) {
            logger.error('Failed to check IP blacklist', { error, ipAddress });
            throw error;
        }
    }

    /**
     * Get all blacklisted IPs
     */
    async getBlacklistedIPs(): Promise<string[]> {
        try {
            return await redisConnection.getBlacklist('ips');
        } catch (error) {
            logger.error('Failed to get blacklisted IPs', { error });
            throw error;
        }
    }

    /**
     * Add device to blacklist
     */
    async addDevice(deviceId: string, reason?: string): Promise<void> {
        try {
            await redisConnection.addToBlacklist('devices', deviceId);

            if (reason) {
                const key = `blacklist:reason:device:${deviceId}`;
                await redisConnection.getClient().set(key, reason);
            }

            logger.audit('Device blacklisted', { deviceId, reason });
        } catch (error) {
            logger.error('Failed to add device to blacklist', { error, deviceId });
            throw error;
        }
    }

    /**
     * Remove device from blacklist
     */
    async removeDevice(deviceId: string): Promise<void> {
        try {
            await redisConnection.removeFromBlacklist('devices', deviceId);

            const key = `blacklist:reason:device:${deviceId}`;
            await redisConnection.getClient().del(key);

            logger.audit('Device removed from blacklist', { deviceId });
        } catch (error) {
            logger.error('Failed to remove device from blacklist', { error, deviceId });
            throw error;
        }
    }

    /**
     * Check if device is blacklisted
     */
    async isDeviceBlacklisted(deviceId: string): Promise<boolean> {
        try {
            return await redisConnection.isBlacklisted('devices', deviceId);
        } catch (error) {
            logger.error('Failed to check device blacklist', { error, deviceId });
            throw error;
        }
    }

    /**
     * Get all blacklisted devices
     */
    async getBlacklistedDevices(): Promise<string[]> {
        try {
            return await redisConnection.getBlacklist('devices');
        } catch (error) {
            logger.error('Failed to get blacklisted devices', { error });
            throw error;
        }
    }

    /**
     * Add account to whitelist
     */
    async addToWhitelist(accountId: string): Promise<void> {
        try {
            await redisConnection.addToWhitelist('accounts', accountId);
            logger.audit('Account whitelisted', { accountId });
        } catch (error) {
            logger.error('Failed to add account to whitelist', { error, accountId });
            throw error;
        }
    }

    /**
     * Check if account is whitelisted
     */
    async isWhitelisted(accountId: string): Promise<boolean> {
        try {
            return await redisConnection.isWhitelisted('accounts', accountId);
        } catch (error) {
            logger.error('Failed to check whitelist', { error, accountId });
            throw error;
        }
    }

    /**
     * Get blacklist statistics
     */
    async getStats(): Promise<{
        accounts: number;
        ips: number;
        devices: number;
    }> {
        try {
            const [accounts, ips, devices] = await Promise.all([
                redisConnection.getBlacklist('accounts'),
                redisConnection.getBlacklist('ips'),
                redisConnection.getBlacklist('devices')
            ]);

            return {
                accounts: accounts.length,
                ips: ips.length,
                devices: devices.length
            };
        } catch (error) {
            logger.error('Failed to get blacklist stats', { error });
            throw error;
        }
    }

    /**
     * Bulk check for blacklisted entities
     */
    async bulkCheck(data: {
        accountId?: string;
        ipAddress?: string;
        deviceId?: string;
    }): Promise<{
        isBlacklisted: boolean;
        reasons: string[];
    }> {
        const reasons: string[] = [];
        let isBlacklisted = false;

        try {
            if (data.accountId) {
                const accountBlacklisted = await this.isAccountBlacklisted(data.accountId);
                if (accountBlacklisted) {
                    isBlacklisted = true;
                    const reason = await this.getBlacklistReason(data.accountId);
                    reasons.push(`Account blacklisted${reason ? `: ${reason}` : ''}`);
                }
            }

            if (data.ipAddress) {
                const ipBlacklisted = await this.isIPBlacklisted(data.ipAddress);
                if (ipBlacklisted) {
                    isBlacklisted = true;
                    reasons.push('IP address blacklisted');
                }
            }

            if (data.deviceId) {
                const deviceBlacklisted = await this.isDeviceBlacklisted(data.deviceId);
                if (deviceBlacklisted) {
                    isBlacklisted = true;
                    reasons.push('Device blacklisted');
                }
            }

            return { isBlacklisted, reasons };
        } catch (error) {
            logger.error('Failed to perform bulk blacklist check', { error, data });
            throw error;
        }
    }
}

export const blacklistService = new BlacklistService();

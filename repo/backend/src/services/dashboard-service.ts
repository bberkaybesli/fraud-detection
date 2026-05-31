import { accountService } from './account-service';
import { transactionService } from './transaction-service';
import { blacklistService } from './blacklist-service';
import { cycleDetector } from '../engine/cycle-detector';
import { smurfingDetector } from '../engine/smurfing-detector';
import { logger } from '../utils/logger';
import { DashboardStats } from '../models/types';

export class DashboardService {
    /**
     * Get comprehensive dashboard statistics
     */
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            const [
                txStats,
                highRiskAccounts,
                blacklistStats,
                cycleStats,
                smurfingStats
            ] = await Promise.all([
                transactionService.getTransactionStats(),
                accountService.getHighRiskAccounts(70, 10),
                blacklistService.getStats(),
                cycleDetector.getCycleStats(),
                smurfingDetector.getSmurfingStats()
            ]);

            const dashboard: DashboardStats = {
                today: {
                    total_transactions: txStats.total,
                    rejected_transactions: txStats.rejected,
                    review_transactions: txStats.review,
                    accepted_transactions: txStats.accepted,
                    total_amount: txStats.totalAmount,
                    avg_fraud_score: this.calculateAvgFraudScore(txStats)
                },
                top_fraud_accounts: highRiskAccounts.map(acc => ({
                    account_id: acc.account_id,
                    fraud_score: acc.fraud_score,
                    risk_category: acc.risk_category,
                    pagerank: acc.pagerank,
                    tx_count: 0 // Bu gerçek implementasyonda hesaplanmalı
                })),
                fraud_signals: [
                    {
                        signal: 'ring_trading',
                        count: cycleStats.totalCycles,
                        avg_score: 75
                    },
                    {
                        signal: 'smurfing',
                        count: smurfingStats.totalPatterns,
                        avg_score: 70
                    },
                    {
                        signal: 'blacklist',
                        count: blacklistStats.accounts,
                        avg_score: 100
                    }
                ],
                masak_reports: {
                    pending: 0,
                    sent_today: 0,
                    total: 0
                },
                blacklist_stats: blacklistStats,
                community_distribution: [] // PageRank/Louvain eklenince doldurulacak
            };

            return dashboard;
        } catch (error) {
            logger.error('Failed to get dashboard stats', { error });
            throw error;
        }
    }

    /**
     * Calculate average fraud score
     */
    private calculateAvgFraudScore(txStats: any): number {
        const total = txStats.total;
        if (total === 0) return 0;

        // Weighted average based on decision
        const score = (
            (txStats.rejected * 85) +
            (txStats.review * 50) +
            (txStats.accepted * 15)
        ) / total;

        return Math.round(score);
    }

    /**
     * Get real-time statistics
     */
    async getRealTimeStats(): Promise<{
        active_transactions: number;
        fraud_alerts: number;
        system_health: string;
    }> {
        return {
            active_transactions: 0,
            fraud_alerts: 0,
            system_health: 'healthy'
        };
    }

    /**
     * Get trend data for charts
     */
    async getTrendData(days: number = 7): Promise<{
        dates: string[];
        transactions: number[];
        fraud_scores: number[];
        rejections: number[];
    }> {
        // Mock data - production'da gerçek verilerle doldurulmalı
        const dates: string[] = [];
        const transactions: number[] = [];
        const fraud_scores: number[] = [];
        const rejections: number[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            transactions.push(0);
            fraud_scores.push(0);
            rejections.push(0);
        }

        return {
            dates,
            transactions,
            fraud_scores,
            rejections
        };
    }
}

export const dashboardService = new DashboardService();

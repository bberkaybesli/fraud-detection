import { Transaction, FraudDecision, FraudSignal, FraudExplanation } from '../models/types';
import { cycleDetector } from './cycle-detector';
import { smurfingDetector } from './smurfing-detector';
import { accountService } from '../services/account-service';
import { transactionService } from '../services/transaction-service';
import { blacklistService } from '../services/blacklist-service';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { config } from '../config';

export class FraudScorer {
    /**
     * Main fraud scoring function - analyzes a transaction in real-time
     */
    async scoreTransaction(tx: Transaction): Promise<FraudDecision> {
        const startTime = Date.now();
        const signals: FraudSignal[] = [];

        try {
            // 1. Blacklist checks (fastest, O(1))
            const blacklistCheck = await this.checkBlacklists(tx);
            if (blacklistCheck) {
                signals.push(blacklistCheck);
            }

            // 2. Whitelist check (skip further checks if whitelisted)
            const isWhitelisted = await blacklistService.isWhitelisted(tx.sender);
            if (isWhitelisted) {
                logger.info('Transaction whitelisted', { tx_id: tx.tx_id, sender: tx.sender });
                return this.createDecision('accept', signals, startTime);
            }

            // 3. Rate limiting check
            const rateLimitSignal = await this.checkRateLimit(tx.sender);
            if (rateLimitSignal) {
                signals.push(rateLimitSignal);
            }

            // 4. Amount-based checks
            const amountSignals = await this.checkAmount(tx);
            signals.push(...amountSignals);

            // 5. Cycle detection (ring trading)
            const cycleSignal = await this.checkCycles(tx);
            if (cycleSignal) {
                signals.push(cycleSignal);
            }

            // 6. Smurfing detection
            const smurfingSignal = await this.checkSmurfing(tx.sender);
            if (smurfingSignal) {
                signals.push(smurfingSignal);
            }

            // 7. Velocity checks (transaction frequency)
            const velocitySignal = await this.checkVelocity(tx.sender);
            if (velocitySignal) {
                signals.push(velocitySignal);
            }

            // 8. Account age and history
            const accountSignals = await this.checkAccountHistory(tx.sender);
            signals.push(...accountSignals);

            // 9. Time-based anomalies
            const timeSignal = this.checkTimeAnomaly(tx);
            if (timeSignal) {
                signals.push(timeSignal);
            }

            // Calculate final fraud score
            const fraudScore = this.calculateFinalScore(signals);

            // Make decision based on thresholds
            const decision = this.makeDecision(fraudScore);

            // Update account fraud scores
            await this.updateAccountScores(tx.sender, tx.recipient, fraudScore);

            const processingTime = Date.now() - startTime;

            logger.info('Transaction scored', {
                tx_id: tx.tx_id,
                decision,
                fraud_score: fraudScore,
                signals: signals.length,
                processing_time_ms: processingTime
            });

            return {
                decision,
                fraud_score: fraudScore,
                reasons: signals,
                timestamp: new Date(),
                processing_time_ms: processingTime
            };
        } catch (error: any) {
            console.error('CRITICAL ERROR IN SCORE TRANSACTION:', error);
            logger.error('Failed to score transaction', { error, tx });

            // Fail-safe: reject on error
            return {
                decision: 'reject',
                fraud_score: 100,
                reasons: [{
                    signal: 'system_error',
                    score: 100,
                    detail: `Fraud scoring system error: ${error.message || error}`,
                    severity: 'critical'
                }],
                timestamp: new Date(),
                processing_time_ms: Date.now() - startTime
            };
        }
    }

    /**
     * Check blacklists (accounts, IPs, devices)
     */
    private async checkBlacklists(tx: Transaction): Promise<FraudSignal | null> {
        const blacklistCheck = await blacklistService.bulkCheck({
            accountId: tx.sender,
            ipAddress: tx.ip_address,
            deviceId: tx.device_id
        });

        if (blacklistCheck.isBlacklisted) {
            return {
                signal: 'blacklist',
                score: 100,
                detail: blacklistCheck.reasons.join(', '),
                severity: 'critical'
            };
        }

        return null;
    }

    /**
     * Check rate limiting
     */
    private async checkRateLimit(accountId: string): Promise<FraudSignal | null> {
        const rateLimit = await transactionService.checkRateLimit(accountId);

        if (!rateLimit.allowed) {
            return {
                signal: 'rate_limit_exceeded',
                score: 80,
                detail: `${rateLimit.count} transactions in ${config.fraud.rateLimitWindowSeconds}s (max: ${config.fraud.rateLimitMaxTransactions})`,
                severity: 'high'
            };
        }

        // Warning if approaching limit
        if (rateLimit.count > config.fraud.rateLimitMaxTransactions * 0.8) {
            return {
                signal: 'rate_limit_warning',
                score: 20,
                detail: `High transaction frequency: ${rateLimit.count} transactions`,
                severity: 'low'
            };
        }

        return null;
    }

    /**
     * Check transaction amount
     */
    private async checkAmount(tx: Transaction): Promise<FraudSignal[]> {
        const signals: FraudSignal[] = [];

        // Large transaction
        if (tx.amount > config.fraud.largeTransactionThreshold) {
            signals.push({
                signal: 'large_amount',
                score: 30,
                detail: `Amount ${tx.amount} exceeds threshold ${config.fraud.largeTransactionThreshold}`,
                severity: 'medium'
            });
        }

        // Suspicious round number
        if (tx.amount % 10000 === 0 && tx.amount >= 50000) {
            signals.push({
                signal: 'round_amount',
                score: 15,
                detail: `Suspicious round amount: ${tx.amount}`,
                severity: 'low'
            });
        }

        // Just below reporting threshold (structuring)
        if (tx.amount > 9500 && tx.amount < 10000) {
            signals.push({
                signal: 'threshold_avoidance',
                score: 40,
                detail: `Amount ${tx.amount} just below 10,000 threshold`,
                severity: 'high'
            });
        }

        return signals;
    }

    /**
     * Check for cycles (ring trading)
     */
    private async checkCycles(tx: Transaction): Promise<FraudSignal | null> {
        const cycle = await cycleDetector.detectCycle(
            tx.sender,
            tx.recipient,
            tx.amount,
            4 // max depth
        );

        if (cycle) {
            const cycleScore = cycleDetector.calculateCycleRiskScore(cycle);
            return {
                signal: 'ring_trading',
                score: cycleScore,
                detail: `Cycle detected: ${cycle.path.join(' → ')} (${cycle.length} hops, ${cycle.total_amount} total)`,
                severity: cycleScore > 70 ? 'critical' : 'high'
            };
        }

        return null;
    }

    /**
     * Check for smurfing patterns
     */
    private async checkSmurfing(accountId: string): Promise<FraudSignal | null> {
        const pattern = await smurfingDetector.detectSmurfing(
            accountId,
            24, // 24 hour window
            10, // min 10 transactions
            10000 // max avg 10k
        );

        if (pattern) {
            const smurfingScore = smurfingDetector.calculateSmurfingRiskScore(pattern);
            return {
                signal: 'smurfing',
                score: smurfingScore,
                detail: `${pattern.pattern_type}: ${pattern.tx_count} txs, avg ${pattern.avg_amount.toFixed(0)}, total ${pattern.total_amount}`,
                severity: smurfingScore > 70 ? 'critical' : 'high'
            };
        }

        return null;
    }

    /**
     * Check transaction velocity
     */
    private async checkVelocity(accountId: string): Promise<FraudSignal | null> {
        const count24h = await transactionService.countTransactionsInWindow(accountId, 24);
        const amount24h = await transactionService.getTotalAmountInWindow(accountId, 24);

        const signals: FraudSignal[] = [];

        // High transaction count
        if (count24h > 50) {
            return {
                signal: 'high_velocity',
                score: 40,
                detail: `${count24h} transactions in 24h`,
                severity: 'medium'
            };
        }

        // High total amount
        if (amount24h > 500000) {
            return {
                signal: 'high_volume',
                score: 35,
                detail: `${amount24h} total in 24h`,
                severity: 'medium'
            };
        }

        return null;
    }

    /**
     * Check account history
     */
    private async checkAccountHistory(accountId: string): Promise<FraudSignal[]> {
        const signals: FraudSignal[] = [];

        try {
            const account = await accountService.getAccount(accountId);

            if (!account) {
                signals.push({
                    signal: 'unknown_account',
                    score: 50,
                    detail: 'Account not found in system',
                    severity: 'high'
                });
                return signals;
            }

            // Check existing fraud score
            if (account.fraud_score > 70) {
                signals.push({
                    signal: 'high_risk_account',
                    score: account.fraud_score * 0.5, // 50% weight
                    detail: `Account fraud score: ${account.fraud_score}`,
                    severity: 'high'
                });
            }

            // Check account age (new accounts are riskier)
            const accountAge = Date.now() - new Date(account.created_at).getTime();
            const ageInDays = accountAge / (1000 * 60 * 60 * 24);

            if (ageInDays < 7) {
                signals.push({
                    signal: 'new_account',
                    score: 25,
                    detail: `Account age: ${ageInDays.toFixed(1)} days`,
                    severity: 'medium'
                });
            }
        } catch (error) {
            logger.error('Failed to check account history', { error, accountId });
        }

        return signals;
    }

    /**
     * Check time-based anomalies
     */
    private checkTimeAnomaly(tx: Transaction): FraudSignal | null {
        const hour = tx.timestamp.getHours();

        // Transactions between 2 AM and 5 AM are suspicious
        if (hour >= 2 && hour < 5) {
            return {
                signal: 'unusual_time',
                score: 15,
                detail: `Transaction at ${hour}:00 (unusual hour)`,
                severity: 'low'
            };
        }

        return null;
    }

    /**
     * Calculate final fraud score from all signals
     */
    private calculateFinalScore(signals: FraudSignal[]): number {
        if (signals.length === 0) {
            return 0;
        }

        // Use weighted average with emphasis on critical signals
        let totalScore = 0;
        let totalWeight = 0;

        signals.forEach(signal => {
            let weight = 1;

            switch (signal.severity) {
                case 'critical':
                    weight = 3;
                    break;
                case 'high':
                    weight = 2;
                    break;
                case 'medium':
                    weight = 1.5;
                    break;
                case 'low':
                    weight = 1;
                    break;
            }

            totalScore += signal.score * weight;
            totalWeight += weight;
        });

        let finalScore = totalScore / totalWeight;

        // Ensure critical signals dominate the final score
        const criticalSignals = signals.filter(s => s.severity === 'critical');
        if (criticalSignals.length > 0) {
            // Blacklisted accounts/IPs should result in an immediate 100 score
            if (criticalSignals.some(s => s.signal === 'blacklist')) {
                return 100;
            }
            
            const maxCriticalScore = Math.max(...criticalSignals.map(s => s.score));
            finalScore = Math.max(finalScore, maxCriticalScore * 0.85); // Ensures a cycle (100) results in at least 85
        }

        return Math.min(Math.round(finalScore), 100);
    }

    /**
     * Make decision based on fraud score
     */
    private makeDecision(fraudScore: number): 'accept' | 'reject' | 'review' {
        if (fraudScore >= config.fraud.scoreRejectThreshold) {
            return 'reject';
        } else if (fraudScore >= config.fraud.scoreReviewThreshold) {
            return 'review';
        } else {
            return 'accept';
        }
    }

    /**
     * Update account fraud scores
     */
    private async updateAccountScores(
        senderId: string,
        recipientId: string,
        txFraudScore: number
    ): Promise<void> {
        try {
            // Update sender's fraud score (weighted average)
            const sender = await accountService.getAccount(senderId);
            if (sender) {
                const newScore = Math.round((sender.fraud_score * 0.9) + (txFraudScore * 0.1));
                const riskCategory = this.getRiskCategory(newScore);
                await accountService.updateFraudScore(senderId, newScore, riskCategory);
            }

            // Recipient gets smaller impact
            const recipient = await accountService.getAccount(recipientId);
            if (recipient && txFraudScore > 50) {
                const newScore = Math.round((recipient.fraud_score * 0.95) + (txFraudScore * 0.05));
                const riskCategory = this.getRiskCategory(newScore);
                await accountService.updateFraudScore(recipientId, newScore, riskCategory);
            }
        } catch (error) {
            logger.error('Failed to update account scores', { error, senderId, recipientId });
        }
    }

    /**
     * Get risk category from fraud score
     */
    private getRiskCategory(score: number): string {
        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Create decision object
     */
    private createDecision(
        decision: 'accept' | 'reject' | 'review',
        signals: FraudSignal[],
        startTime: number
    ): FraudDecision {
        return {
            decision,
            fraud_score: this.calculateFinalScore(signals),
            reasons: signals,
            timestamp: new Date(),
            processing_time_ms: Date.now() - startTime
        };
    }

    /**
     * Get detailed fraud explanation for a transaction
     */
    async getExplanation(txId: string): Promise<FraudExplanation | null> {
        try {
            // Check cache first
            const cached = await redisConnection.getExplanation(txId);
            if (cached) {
                return cached;
            }

            // Get transaction
            const tx = await transactionService.getTransaction(txId);
            if (!tx) {
                return null;
            }

            // Re-score to get explanation
            const decision = await this.scoreTransaction({
                tx_id: tx.tx_id,
                sender: tx.sender,
                recipient: tx.recipient,
                amount: tx.amount,
                currency: tx.currency,
                timestamp: new Date(tx.timestamp),
                channel: tx.channel,
                description: tx.description,
                flagged: tx.status === 'REJECTED'
            });

            const explanation: FraudExplanation = {
                tx_id: txId,
                decision: decision.decision,
                fraud_score: decision.fraud_score,
                reasons: decision.reasons,
                timestamp: new Date()
            };

            // Cache explanation
            await redisConnection.cacheExplanation(txId, explanation, 86400);

            return explanation;
        } catch (error) {
            logger.error('Failed to get fraud explanation', { error, txId });
            return null;
        }
    }
}

export const fraudScorer = new FraudScorer();

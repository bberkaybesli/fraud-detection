import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MasakReport } from '../models/types';

export class MasakService {
    /**
     * Send report to MASAK
     */
    async sendReport(report: MasakReport): Promise<boolean> {
        try {
            const response = await axios.post(
                `${config.masak.mockUrl}/reports`,
                report,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'masak-api-key' // Production'da gerçek key kullanılmalı
                    },
                    timeout: 10000
                }
            );

            if (response.status === 200 || response.status === 201) {
                logger.info('MASAK report sent successfully', {
                    report_id: report.report_id,
                    tx_id: report.tx_id
                });
                return true;
            }

            logger.error('MASAK report failed', {
                report_id: report.report_id,
                status: response.status
            });
            return false;
        } catch (error) {
            logger.error('Failed to send MASAK report', {
                error,
                report_id: report.report_id
            });
            return false;
        }
    }

    /**
     * Generate MASAK report from transaction data
     */
    generateReport(data: {
        tx_id: string;
        sender: string;
        recipient: string;
        amount: number;
        currency: string;
        fraud_score: number;
        reasons: string[];
    }): MasakReport {
        const report: MasakReport = {
            report_id: `MASAK-${data.tx_id}-${Date.now()}`,
            tx_id: data.tx_id,
            sender: data.sender,
            recipient: data.recipient,
            amount: data.amount,
            currency: data.currency,
            reason: data.reasons.join('; '),
            fraud_score: data.fraud_score,
            evidence: data.reasons.map(reason => ({
                signal: 'fraud_detection',
                score: data.fraud_score,
                detail: reason,
                severity: data.fraud_score > 80 ? 'critical' : 'high'
            })),
            timestamp: new Date(),
            status: 'pending'
        };

        return report;
    }

    /**
     * Batch send multiple reports
     */
    async sendBatchReports(reports: MasakReport[]): Promise<{
        success: number;
        failed: number;
    }> {
        let success = 0;
        let failed = 0;

        for (const report of reports) {
            const sent = await this.sendReport(report);
            if (sent) {
                success++;
            } else {
                failed++;
            }
        }

        logger.info('Batch MASAK reports sent', { success, failed, total: reports.length });

        return { success, failed };
    }

    /**
     * Get report statistics
     */
    async getStats(): Promise<{
        total: number;
        pending: number;
        sent: number;
        failed: number;
    }> {
        // Bu production'da veritabanından alınmalı
        // Şimdilik mock data
        return {
            total: 0,
            pending: 0,
            sent: 0,
            failed: 0
        };
    }
}

export const masakService = new MasakService();

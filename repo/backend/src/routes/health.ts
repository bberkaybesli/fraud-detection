import { Router, Request, Response } from 'express';
import { neo4jConnection } from '../config/neo4j';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const [neo4jHealthy, redisHealthy] = await Promise.all([
            neo4jConnection.healthCheck(),
            redisConnection.healthCheck()
        ]);

        const isHealthy = neo4jHealthy && redisHealthy;
        const status = isHealthy ? 'healthy' : 'unhealthy';

        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            data: {
                status,
                neo4j: neo4jHealthy ? 'up' : 'down',
                redis: redisHealthy ? 'up' : 'down',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
            success: false,
            error: {
                code: 'HEALTH_CHECK_FAILED',
                message: 'Health check failed'
            }
        });
    }
});

export default router;

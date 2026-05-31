import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from '../config';
import { logger } from '../utils/logger';

class Neo4jConnection {
    private driver: Driver | null = null;

    async connect(): Promise<void> {
        try {
            this.driver = neo4j.driver(
                config.neo4j.uri,
                neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
                {
                    maxConnectionPoolSize: config.neo4j.maxConnectionPoolSize,
                    connectionTimeout: config.neo4j.connectionTimeout,
                }
            );

            // Verify connectivity
            await this.driver.verifyConnectivity();
            logger.info('Neo4j connection established successfully');

            // Initialize database (run init script)
            await this.initializeDatabase();
        } catch (error) {
            logger.error('Failed to connect to Neo4j:', error);
            throw error;
        }
    }

    async initializeDatabase(): Promise<void> {
        const session = this.getSession();
        try {
            // Create constraints
            await session.run(`
        CREATE CONSTRAINT account_id_unique IF NOT EXISTS
        FOR (a:Account) REQUIRE a.account_id IS UNIQUE
      `);

            await session.run(`
        CREATE CONSTRAINT person_tc_unique IF NOT EXISTS
        FOR (p:Person) REQUIRE p.tc_hash IS UNIQUE
      `);

            // Create indexes
            const indexes = [
                'CREATE INDEX account_risk_category IF NOT EXISTS FOR (a:Account) ON (a.risk_category)',
                'CREATE INDEX account_fraud_score IF NOT EXISTS FOR (a:Account) ON (a.fraud_score)',
                'CREATE INDEX account_bank IF NOT EXISTS FOR (a:Account) ON (a.bank)',
                'CREATE INDEX account_country IF NOT EXISTS FOR (a:Account) ON (a.country)',
                'CREATE INDEX account_tc_hash IF NOT EXISTS FOR (a:Account) ON (a.tc_hash)',
                'CREATE INDEX account_pagerank IF NOT EXISTS FOR (a:Account) ON (a.pagerank)',
                'CREATE INDEX account_community IF NOT EXISTS FOR (a:Account) ON (a.community)',
            ];

            for (const indexQuery of indexes) {
                await session.run(indexQuery);
            }

            logger.info('Neo4j database initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Neo4j database:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    getSession(): Session {
        if (!this.driver) {
            throw new Error('Neo4j driver not initialized. Call connect() first.');
        }
        return this.driver.session();
    }

    getDriver(): Driver {
        if (!this.driver) {
            throw new Error('Neo4j driver not initialized. Call connect() first.');
        }
        return this.driver;
    }

    async close(): Promise<void> {
        if (this.driver) {
            await this.driver.close();
            logger.info('Neo4j connection closed');
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.driver) {
                return false;
            }
            await this.driver.verifyConnectivity();
            return true;
        } catch (error) {
            logger.error('Neo4j health check failed:', error);
            return false;
        }
    }
}

export const neo4jConnection = new Neo4jConnection();

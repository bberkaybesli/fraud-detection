import { neo4jConnection } from './config/neo4j';
import { redisConnection } from './config/redis';
import { generateRandomTcKimlik } from './utils/hash';
import { logger } from './utils/logger';

/**
 * Seed script to generate test data
 * - 1000 accounts
 * - 10,000 transactions
 * - Test fraud patterns (cycles, smurfing)
 */

async function seed() {
    try {
        logger.info('Starting seed process...');

        // Connect to databases
        await neo4jConnection.connect();
        await redisConnection.connect();

        logger.info('Connected to databases');

        // Clear existing data (optional - comment out to keep existing data)
        await clearData();

        // Generate accounts
        logger.info('Generating 1000 accounts...');
        await generateAccounts(1000);

        // Generate normal transactions
        logger.info('Generating 8000 normal transactions...');
        await generateNormalTransactions(8000);

        // Generate fraud patterns
        logger.info('Generating fraud patterns...');
        await generateFraudPatterns();

        logger.info('✅ Seed completed successfully!');
        logger.info('Summary:');
        logger.info('- 1000 accounts created');
        logger.info('- 10,000+ transactions created');
        logger.info('- Fraud patterns: cycles, smurfing, high-risk accounts');

        process.exit(0);
    } catch (error) {
        logger.error('Seed failed', { error });
        process.exit(1);
    }
}

/**
 * Clear existing data
 */
async function clearData() {
    const session = neo4jConnection.getSession();

    try {
        logger.info('Clearing existing data...');

        // Delete all relationships and nodes
        await session.run('MATCH (n) DETACH DELETE n');

        // Clear Redis
        await redisConnection.getClient().flushDb();

        logger.info('Data cleared');
    } finally {
        await session.close();
    }
}

/**
 * Generate accounts
 */
async function generateAccounts(count: number) {
    const session = neo4jConnection.getSession();

    try {
        const banks = ['Ziraat', 'İş Bankası', 'Garanti', 'Akbank', 'Yapı Kredi', 'Halkbank'];
        const names = [
            'Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Çelik', 'Ali Şahin',
            'Zeynep Yıldız', 'Mustafa Arslan', 'Elif Öztürk', 'Hüseyin Aydın', 'Hatice Özdemir'
        ];

        for (let i = 1; i <= count; i++) {
            const accountId = `ACC-${String(i).padStart(6, '0')}`;
            const tcKimlik = generateRandomTcKimlik();
            const name = names[Math.floor(Math.random() * names.length)];
            const bank = banks[Math.floor(Math.random() * banks.length)];

            await session.run(
                `
        CREATE (a:Account {
          account_id: $account_id,
          tc_kimlik_hash: $tc_kimlik_hash,
          name: $name,
          account_type: $bank,
          created_at: datetime(),
          fraud_score: 0.0,
          risk_category: 'LOW',
          pagerank: 0.0,
          community_id: null
        })
        `,
                {
                    account_id: accountId,
                    tc_kimlik_hash: tcKimlik,
                    name: name,
                    bank: bank
                }
            );

            if (i % 100 === 0) {
                logger.info(`Created ${i} accounts...`);
            }
        }
        
        // --- ADD DEMO ACCOUNTS ---
        logger.info('Creating explicit demo accounts...');
        const demoAccounts = ['ACC-001', 'ACC-002', 'RING-A', 'RING-B', 'RING-C', 'SMURF-1', 'SMURF-2', 'SMURF-3'];
        for (const accountId of demoAccounts) {
            await session.run(
                `
        CREATE (a:Account {
          account_id: $account_id,
          tc_kimlik_hash: $tc_kimlik_hash,
          name: $name,
          account_type: 'Demo',
          created_at: datetime(),
          fraud_score: 0.0,
          risk_category: 'LOW',
          pagerank: 0.0,
          community_id: null
        })
        `,
                {
                    account_id: accountId,
                    tc_kimlik_hash: 'DEMO-' + accountId,
                    name: 'Demo User ' + accountId
                }
            );
        }
        logger.info('Explicit demo accounts created.');
        
    } finally {
        await session.close();
    }
}

/**
 * Generate normal transactions
 */
async function generateNormalTransactions(count: number) {
    const session = neo4jConnection.getSession();

    try {
        for (let i = 1; i <= count; i++) {
            const senderId = Math.floor(Math.random() * 1000) + 1;
            let recipientId = Math.floor(Math.random() * 1000) + 1;

            // Ensure sender != recipient
            while (recipientId === senderId) {
                recipientId = Math.floor(Math.random() * 1000) + 1;
            }

            const sender = `ACC-${String(senderId).padStart(6, '0')}`;
            const recipient = `ACC-${String(recipientId).padStart(6, '0')}`;
            const amount = Math.floor(Math.random() * 50000) + 100;
            const txId = `TX-${String(i).padStart(8, '0')}`;

            await session.run(
                `
        MATCH (sender:Account {account_id: $sender})
        MATCH (recipient:Account {account_id: $recipient})
        CREATE (sender)-[r:TRANSFERRED_TO {
          tx_id: $tx_id,
          amount: $amount,
          currency: 'TRY',
          timestamp: datetime(),
          channel: 'EFT',
          fraud_score: 0.0,
          status: 'ACCEPTED'
        }]->(recipient)
        `,
                { sender, recipient, tx_id: txId, amount }
            );

            if (i % 1000 === 0) {
                logger.info(`Created ${i} transactions...`);
            }
        }
    } finally {
        await session.close();
    }
}

/**
 * Generate fraud patterns
 */
async function generateFraudPatterns() {
    await generateCyclePattern();
    await generateSmurfingPattern();
    await generateHighRiskAccounts();
}

/**
 * Generate cycle pattern (ring trading)
 */
async function generateCyclePattern() {
    const session = neo4jConnection.getSession();

    try {
        logger.info('Creating cycle pattern (A→B→C→A)...');

        // Create a 3-node cycle
        const accounts = ['ACC-000001', 'ACC-000002', 'ACC-000003'];
        const amount = 100000;

        for (let i = 0; i < accounts.length; i++) {
            const sender = accounts[i];
            const recipient = accounts[(i + 1) % accounts.length];
            const txId = `TX-CYCLE-${i + 1}`;

            await session.run(
                `
        MATCH (sender:Account {account_id: $sender})
        MATCH (recipient:Account {account_id: $recipient})
        CREATE (sender)-[r:TRANSFERRED_TO {
          tx_id: $tx_id,
          amount: $amount,
          currency: 'TRY',
          timestamp: datetime(),
          channel: 'SWIFT',
          fraud_score: 85.0,
          status: 'REVIEW'
        }]->(recipient)
        `,
                { sender, recipient, tx_id: txId, amount }
            );
        }

        logger.info('Cycle pattern created');
    } finally {
        await session.close();
    }
}

/**
 * Generate smurfing pattern
 */
async function generateSmurfingPattern() {
    const session = neo4jConnection.getSession();

    try {
        logger.info('Creating smurfing pattern (25 small transactions)...');

        const smurf = 'ACC-000010';
        const amount = 9950; // Just below 10k threshold

        for (let i = 1; i <= 25; i++) {
            const recipient = `ACC-${String(100 + i).padStart(6, '0')}`;
            const txId = `TX-SMURF-${i}`;

            await session.run(
                `
        MATCH (sender:Account {account_id: $sender})
        MATCH (recipient:Account {account_id: $recipient})
        CREATE (sender)-[r:TRANSFERRED_TO {
          tx_id: $tx_id,
          amount: $amount,
          currency: 'TRY',
          timestamp: datetime(),
          channel: 'EFT',
          fraud_score: 70.0,
          status: 'REVIEW'
        }]->(recipient)
        `,
                { sender: smurf, recipient, tx_id: txId, amount }
            );
        }

        logger.info('Smurfing pattern created');
    } finally {
        await session.close();
    }
}

/**
 * Generate high-risk accounts
 */
async function generateHighRiskAccounts() {
    const session = neo4jConnection.getSession();

    try {
        logger.info('Marking high-risk accounts...');

        const highRiskAccounts = [
            'ACC-000001',
            'ACC-000002',
            'ACC-000003',
            'ACC-000010'
        ];

        for (const accountId of highRiskAccounts) {
            await session.run(
                `
        MATCH (a:Account {account_id: $account_id})
        SET a.fraud_score = 85.0,
            a.risk_category = 'HIGH'
        `,
                { account_id: accountId }
            );
        }

        // Add to blacklist in Redis
        await redisConnection.addToBlacklist('accounts', 'ACC-000999');
        await redisConnection.addToBlacklist('accounts', 'ACC-001000');

        logger.info('High-risk accounts marked');
    } finally {
        await session.close();
    }
}

// Run seed
seed();

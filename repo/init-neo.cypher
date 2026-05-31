// Neo4j Initialization Script for Fraud Detection System
// This script creates constraints, indexes, and initial graph projections

// ============================================
// CONSTRAINTS (Uniqueness & Existence)
// ============================================

// Account ID must be unique
CREATE CONSTRAINT account_id_unique IF NOT EXISTS
FOR (a:Account) REQUIRE a.account_id IS UNIQUE;

// Transaction ID must be unique on relationships
// Note: Neo4j doesn't support relationship constraints directly in Community Edition
// We'll handle this in application logic

// ============================================
// INDEXES (Performance Optimization)
// ============================================

// Index on account risk category for filtering
CREATE INDEX account_risk_category IF NOT EXISTS
FOR (a:Account) ON (a.risk_category);

// Index on fraud score for sorting/filtering
CREATE INDEX account_fraud_score IF NOT EXISTS
FOR (a:Account) ON (a.fraud_score);

// Index on account bank for filtering
CREATE INDEX account_bank IF NOT EXISTS
FOR (a:Account) ON (a.bank);

// Index on account country
CREATE INDEX account_country IF NOT EXISTS
FOR (a:Account) ON (a.country);

// Index on TC hash for lookup
CREATE INDEX account_tc_hash IF NOT EXISTS
FOR (a:Account) ON (a.tc_hash);

// Composite index for PageRank queries
CREATE INDEX account_pagerank IF NOT EXISTS
FOR (a:Account) ON (a.pagerank);

// Index on community for clustering queries
CREATE INDEX account_community IF NOT EXISTS
FOR (a:Account) ON (a.community);

// Index on Person TC hash
CREATE CONSTRAINT person_tc_unique IF NOT EXISTS
FOR (p:Person) REQUIRE p.tc_hash IS UNIQUE;

// ============================================
// INITIAL SETUP VERIFICATION
// ============================================

// Return confirmation
RETURN 'Neo4j initialization completed successfully' AS status,
       datetime() AS timestamp;

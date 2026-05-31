// Account model
export interface Account {
    account_id: string;
    name: string;
    tc_kimlik_hash: string; // Hashed TC Kimlik
    account_type: string;
    created_at: string;
    fraud_score: number; // 0-100
    risk_category: string;
    pagerank: number;
    community_id: number | null;
}

// Account create input
export interface AccountCreateInput {
    account_id: string;
    tc_kimlik: string;
    name: string;
    account_type: string;
}

// Account update input
export interface AccountUpdateInput {
    name?: string;
    account_type?: string;
}

// Transaction model
export interface Transaction {
    tx_id: string;
    sender: string;
    recipient: string;
    amount: number;
    currency: string;
    timestamp: Date;
    channel: 'SWIFT' | 'FAST' | 'EFT' | 'havale' | 'kart' | 'POS';
    description?: string;
    ip_address?: string;
    device_id?: string;
    flagged: boolean;
}

// Fraud signal
export interface FraudSignal {
    signal: string;
    score: number; // 0-100
    detail: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// Fraud decision
export interface FraudDecision {
    decision: 'accept' | 'reject' | 'review';
    fraud_score: number; // 0-100
    reasons: FraudSignal[];
    timestamp: Date;
    processing_time_ms: number;
}

// Fraud explanation
export interface FraudExplanation {
    tx_id: string;
    decision: 'accept' | 'reject' | 'review';
    fraud_score: number;
    reasons: FraudSignal[];
    graph_analysis?: {
        cycles?: CycleInfo[];
        pagerank_sender?: number;
        pagerank_recipient?: number;
        community_sender?: number;
        community_recipient?: number;
        shared_connections?: number;
    };
    timestamp: Date;
}

// Cycle information
export interface CycleInfo {
    path: string[]; // Array of account IDs
    length: number;
    total_amount: number;
    duration_hours: number;
    transactions: Array<{
        from: string;
        to: string;
        amount: number;
        timestamp: Date;
    }>;
}

// Smurfing pattern
export interface SmurfingPattern {
    account: string;
    tx_count: number;
    total_amount: number;
    avg_amount: number;
    time_window_hours: number;
    recipients: string[];
    pattern_type: 'split_avoidance' | 'rapid_distribution' | 'structured';
}

// MASAK report
export interface MasakReport {
    report_id: string;
    tx_id: string;
    sender: string;
    recipient: string;
    amount: number;
    currency: string;
    reason: string;
    fraud_score: number;
    evidence: FraudSignal[];
    timestamp: Date;
    sent_at?: Date;
    status: 'pending' | 'sent' | 'failed';
}

// Dashboard statistics
export interface DashboardStats {
    today: {
        total_transactions: number;
        rejected_transactions: number;
        review_transactions: number;
        accepted_transactions: number;
        total_amount: number;
        avg_fraud_score: number;
    };
    top_fraud_accounts: Array<{
        account_id: string;
        fraud_score: number;
        risk_category: string;
        pagerank?: number;
        tx_count: number;
    }>;
    fraud_signals: Array<{
        signal: string;
        count: number;
        avg_score: number;
    }>;
    masak_reports: {
        pending: number;
        sent_today: number;
        total: number;
    };
    blacklist_stats: {
        accounts: number;
        ips: number;
        devices: number;
    };
    community_distribution: Array<{
        community_id: number;
        member_count: number;
        avg_fraud_score: number;
        has_blocked_accounts: boolean;
    }>;
}

// Batch job result
export interface BatchJobResult {
    job_type: 'pagerank' | 'louvain' | 'weakly_connected_components';
    started_at: Date;
    completed_at: Date;
    duration_ms: number;
    nodes_processed: number;
    nodes_updated: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}

// API Response wrapper
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: Date;
}

// Pagination
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

// Auth token payload
export interface TokenPayload {
    username: string;
    role: 'admin' | 'service';
    iat: number;
    exp: number;
}

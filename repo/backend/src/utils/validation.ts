import Joi from 'joi';

// Account validation schema
export const accountSchema = Joi.object({
    account_id: Joi.string()
        .pattern(/^[A-Z0-9-]+$/)
        .min(5)
        .max(50)
        .required()
        .messages({
            'string.pattern.base': 'Account ID must contain only uppercase letters, numbers, and hyphens',
            'string.min': 'Account ID must be at least 5 characters',
            'string.max': 'Account ID must not exceed 50 characters',
        }),
    owner_name: Joi.string().min(2).max(100).required(),
    tc_kimlik: Joi.string()
        .pattern(/^\d{11}$/)
        .required()
        .messages({
            'string.pattern.base': 'TC Kimlik must be exactly 11 digits',
        }),
    bank: Joi.string().min(2).max(50).required(),
    country: Joi.string().length(2).default('TR'),
    opened_at: Joi.date().iso().default(() => new Date()),
});

// Transaction validation schema
export const transactionSchema = Joi.object({
    tx_id: Joi.string()
        .pattern(/^[A-Z0-9-]+$/)
        .min(5)
        .max(50)
        .required(),
    sender: Joi.string().required(),
    recipient: Joi.string().required(),
    amount: Joi.number().positive().min(0.01).max(10000000).required().messages({
        'number.positive': 'Amount must be positive',
        'number.min': 'Amount must be at least 0.01',
        'number.max': 'Amount cannot exceed 10,000,000',
    }),
    currency: Joi.string().length(3).default('TRY'),
    channel: Joi.string()
        .valid('SWIFT', 'FAST', 'EFT', 'havale', 'kart', 'POS')
        .default('EFT'),
    description: Joi.string().max(500).optional(),
    ip_address: Joi.string().ip().optional(),
    device_id: Joi.string().max(100).optional(),
    timestamp: Joi.date().iso().default(() => new Date()),
});

// Fraud check validation schema
export const fraudCheckSchema = Joi.object({
    tx_id: Joi.string()
        .pattern(/^[A-Z0-9-]+$/)
        .min(5)
        .max(50)
        .required(),
    sender: Joi.string().required(),
    recipient: Joi.string().required(),
    amount: Joi.number().positive().min(0.01).max(10000000).required(),
    currency: Joi.string().length(3).default('TRY'),
    channel: Joi.string()
        .valid('SWIFT', 'FAST', 'EFT', 'havale', 'kart', 'POS')
        .default('EFT'),
    description: Joi.string().max(500).optional(),
    ip_address: Joi.string().ip().optional(),
    device_id: Joi.string().max(100).optional(),
});

// Login validation schema
export const loginSchema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(6).required(),
});

// Blacklist validation schema
export const blacklistSchema = Joi.object({
    account_id: Joi.string().required(),
    reason: Joi.string().min(10).max(500).required(),
    evidence: Joi.string().max(2000).optional(),
});

// Whitelist validation schema
export const whitelistSchema = Joi.object({
    account_id: Joi.string().required(),
    reason: Joi.string().min(10).max(500).required(),
});

// Cycle query validation schema
export const cycleQuerySchema = Joi.object({
    min_length: Joi.number().integer().min(2).max(10).default(3),
    max_length: Joi.number().integer().min(2).max(10).default(6),
    min_amount: Joi.number().positive().default(1000),
    time_window_hours: Joi.number().integer().positive().default(24),
});

// Smurfing query validation schema
export const smurfingQuerySchema = Joi.object({
    window_hours: Joi.number().integer().positive().default(24),
    min_count: Joi.number().integer().positive().default(20),
    min_total_amount: Joi.number().positive().default(500000),
});

// Validation helper function
export function validate<T>(schema: Joi.ObjectSchema, data: any): { value: T; error?: Joi.ValidationError } {
    const result = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });

    return {
        value: result.value as T,
        error: result.error,
    };
}

// Convenience validation functions
export function validateTransactionCheck(data: any) {
    return validate(fraudCheckSchema, data);
}

export function validateAccount(data: any) {
    return validate(accountSchema, data);
}

export function validateTransaction(data: any) {
    return validate(transactionSchema, data);
}

export function validateLogin(data: any) {
    return validate(loginSchema, data);
}

import crypto from 'crypto';

/**
 * Hash TC Kimlik number for KVKK compliance
 * Uses SHA-256 to ensure one-way hashing
 */
export function hashTcKimlik(tcKimlik: string): string {
    return crypto.createHash('sha256').update(tcKimlik).digest('hex');
}

/**
 * Validate TC Kimlik format (11 digits)
 */
export function validateTcKimlik(tcKimlik: string): boolean {
    // Basic format check: 11 digits
    if (!/^\d{11}$/.test(tcKimlik)) {
        return false;
    }

    // First digit cannot be 0
    if (tcKimlik[0] === '0') {
        return false;
    }

    // TC Kimlik algorithm validation
    const digits = tcKimlik.split('').map(Number);

    // 10th digit check
    const sum1 = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7;
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    const digit10 = (sum1 - sum2) % 10;

    if (digits[9] !== digit10) {
        return false;
    }

    // 11th digit check
    const sum3 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    const digit11 = sum3 % 10;

    if (digits[10] !== digit11) {
        return false;
    }

    return true;
}

/**
 * Generate random TC Kimlik for testing (valid format)
 */
export function generateRandomTcKimlik(): string {
    // Generate first 9 digits
    const digits: number[] = [];
    digits[0] = Math.floor(Math.random() * 9) + 1; // First digit 1-9

    for (let i = 1; i < 9; i++) {
        digits[i] = Math.floor(Math.random() * 10);
    }

    // Calculate 10th digit
    const sum1 = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7;
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    digits[9] = (sum1 - sum2) % 10;

    // Calculate 11th digit
    const sum3 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    digits[10] = sum3 % 10;

    return digits.join('');
}

/**
 * Mask TC Kimlik for display (show only first 3 and last 2 digits)
 */
export function maskTcKimlik(tcKimlik: string): string {
    if (tcKimlik.length !== 11) {
        return '***********';
    }
    return `${tcKimlik.substring(0, 3)}******${tcKimlik.substring(9)}`;
}

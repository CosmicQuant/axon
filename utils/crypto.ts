/**
 * Cryptographically secure random utilities.
 * Math.random() is predictable and must never be used for security-sensitive
 * values like delivery verification PINs.
 */

/**
 * Generate a cryptographically secure random PIN of the given digit count.
 * Uses crypto.getRandomValues (Web Crypto API) — available in all modern
 * browsers, Capacitor WebView, and Node 19+.
 *
 * @param digits Number of digits (default 6). Legacy orders use 4.
 * @returns A zero-padded numeric string of exactly `digits` length.
 */
export const generateSecureCode = (digits: number = 6): string => {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const range = max - min + 1;

    // Rejection sampling to avoid modulo bias
    const maxUint32 = 0xFFFFFFFF;
    const limit = maxUint32 - (maxUint32 % range);

    const arr = new Uint32Array(1);
    let value: number;
    do {
        crypto.getRandomValues(arr);
        value = arr[0];
    } while (value >= limit);

    return String(min + (value % range));
};

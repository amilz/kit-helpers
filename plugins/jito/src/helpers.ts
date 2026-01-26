import type { Address, Base64EncodedWireTransaction } from '@solana/kit';

import type { Bundle, BundleBuilder, JitoApi, SimulateBundleOptions, SimulateBundleResult } from './types';

/** Maximum number of transactions allowed in a Jito bundle. */
export const MAX_BUNDLE_SIZE = 5;

/** Minimum tip amount in lamports. */
export const MIN_TIP_LAMPORTS = 1000n;

/**
 * Select a random tip account from the available accounts.
 * Uses crypto.getRandomValues for secure random selection.
 * @param accounts - Array of tip account addresses.
 * @returns A randomly selected address.
 * @throws If the accounts array is empty.
 */
export function getRandomTipAccount(accounts: readonly Address[]): Address {
    if (accounts.length === 0) {
        throw new Error('No tip accounts available');
    }
    // Use crypto.getRandomValues for secure random selection
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomIndex = randomBytes[0] % accounts.length;
    return accounts[randomIndex];
}

/**
 * Validate a bundle before submission.
 * @param bundle - The bundle to validate.
 * @throws If the bundle is invalid.
 */
export function validateBundle(bundle: Bundle): void {
    if (bundle.length === 0) {
        throw new Error('Bundle is empty');
    }
    if (bundle.length > MAX_BUNDLE_SIZE) {
        throw new Error(`Bundle exceeds maximum size of ${MAX_BUNDLE_SIZE} transactions (got ${bundle.length})`);
    }
}

/**
 * Create a new bundle builder for fluent bundle construction.
 * @param jitoApi - The Jito API instance for sending/simulating.
 * @returns A new BundleBuilder.
 */
export function createBundleBuilder(jitoApi: JitoApi): BundleBuilder {
    const transactions: Base64EncodedWireTransaction[] = [];

    const builder: BundleBuilder = {
        add(transaction: Base64EncodedWireTransaction): BundleBuilder {
            transactions.push(transaction);
            return builder;
        },

        addMany(txs: readonly Base64EncodedWireTransaction[]): BundleBuilder {
            transactions.push(...txs);
            return builder;
        },

        getBundle(): Bundle {
            return [...transactions];
        },

        async send(): Promise<string> {
            validateBundle(transactions);
            return await jitoApi.sendBundle(transactions);
        },

        async simulate(options?: SimulateBundleOptions): Promise<SimulateBundleResult> {
            if (transactions.length === 0) {
                throw new Error('Bundle is empty');
            }
            return await jitoApi.simulateBundle(transactions, options);
        },
    };

    return builder;
}

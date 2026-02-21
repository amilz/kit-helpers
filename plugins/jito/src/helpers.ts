import { AccountRole, type Address, type Base64EncodedWireTransaction, type Instruction } from '@solana/kit';

import type { Bundle, BundleBuilder, JitoApi, SimulateBundleOptions, SimulateBundleResult } from './types';

/** Maximum number of transactions allowed in a Jito bundle. */
export const MAX_BUNDLE_SIZE = 5;

/**
 * Default jitodontfront pubkey. Any valid pubkey starting with "jitodontfront"
 * works — the account does not need to exist on-chain.
 *
 * @see https://docs.jito.wtf/lowlatencytxnsend/#sandwich-mitigation
 */
export const DEFAULT_DONT_FRONT_ACCOUNT =
    'jitodontfront111111111111111111111111111111' as Address<'jitodontfront111111111111111111111111111111'>;

/**
 * Append a jitodontfront account as read-only to an instruction.
 *
 * The Jito block engine detects accounts with the "jitodontfront" prefix and
 * enforces that any bundle containing this transaction must place it at index 0,
 * preventing sandwich attacks.
 *
 * Works with any instruction — the extra read-only account is ignored by the
 * target program but recognized by the block engine.
 *
 * @param instruction - The instruction to protect.
 * @param dontFrontAccount - Optional custom dontfront pubkey (must start with "jitodontfront").
 *   Defaults to `jitodontfront111111111111111111111111111111`.
 * @returns A new instruction with the dontfront account appended.
 *
 * @example
 * ```ts
 * import { getTransferSolInstruction } from '@solana-program/system';
 * import { withDontFront } from '@kit-helpers/jito';
 *
 * const protectedTransfer = withDontFront(
 *     getTransferSolInstruction({
 *         source: payer,
 *         destination: recipient,
 *         amount: lamports(1_000_000n),
 *     })
 * );
 * ```
 *
 * @example
 * With a custom dontfront address for per-app tracking:
 * ```ts
 * const protectedIx = withDontFront(myInstruction, address('jitodontfrontMyApp111111111111111111111'));
 * ```
 *
 * @see https://docs.jito.wtf/lowlatencytxnsend/#sandwich-mitigation
 */
export function withDontFront(instruction: Instruction, dontFrontAccount?: Address): Instruction {
    const account = dontFrontAccount ?? DEFAULT_DONT_FRONT_ACCOUNT;
    return {
        ...instruction,
        accounts: [...(instruction.accounts ?? []), { address: account, role: AccountRole.READONLY }],
    };
}

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

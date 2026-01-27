/**
 * Transaction result utilities for LiteSVM
 *
 * Provides type guards and assertions for handling LiteSVM transaction results,
 * following the same patterns as @solana/kit (e.g., assertIsAddress).
 */

import type { FailedTransactionMetadata, TransactionMetadata } from '@loris-sandbox/litesvm-kit';
import { SimulatedTransactionInfo } from '@loris-sandbox/litesvm-kit';

// Re-export types for convenience
export type { FailedTransactionMetadata, TransactionMetadata } from '@loris-sandbox/litesvm-kit';
export { SimulatedTransactionInfo } from '@loris-sandbox/litesvm-kit';

// ============================================================================
// Transaction Result Types
// ============================================================================

/** Result from sendTransaction */
export type SendTransactionResult = TransactionMetadata | FailedTransactionMetadata;

/** Result from airdrop or getTransaction (can be null) */
export type TransactionResult = TransactionMetadata | FailedTransactionMetadata | null;

/** Result from simulateTransaction */
export type SimulationResult = SimulatedTransactionInfo | FailedTransactionMetadata;

// ============================================================================
// Transaction Type Guards
// ============================================================================

/**
 * Type guard: check if transaction result is successful (TransactionMetadata)
 *
 * @example
 * ```ts
 * const result = client.svm.sendTransaction(tx);
 * if (isSuccessfulTransaction(result)) {
 *     console.log(result.computeUnitsConsumed());
 * }
 * ```
 */
export function isSuccessfulTransaction(
    result: TransactionResult | SendTransactionResult,
): result is TransactionMetadata {
    return result !== null && !('err' in result);
}

/**
 * Type guard: check if result is a FailedTransactionMetadata
 *
 * @example
 * ```ts
 * const result = client.svm.sendTransaction(tx);
 * if (isFailedTransaction(result)) {
 *     console.error(result.err());
 * }
 * ```
 */
export function isFailedTransaction(
    result: TransactionResult | SendTransactionResult | SimulationResult,
): result is FailedTransactionMetadata {
    return result !== null && 'err' in result;
}

// ============================================================================
// Transaction Assertions
// ============================================================================

/**
 * Assert that a transaction result is successful (TransactionMetadata).
 * Throws if the result is null or a FailedTransactionMetadata.
 *
 * @example
 * ```ts
 * const result = client.svm.airdrop(address, lamports);
 * assertIsSuccessfulTransaction(result);
 * console.log(result.computeUnitsConsumed()); // result is TransactionMetadata
 * ```
 */
export function assertIsSuccessfulTransaction(
    result: TransactionResult | SendTransactionResult,
    message?: string,
): asserts result is TransactionMetadata {
    if (result === null) {
        throw new Error(message ?? 'Expected successful transaction but got null');
    }
    if ('err' in result) {
        const errMsg = message ?? 'Transaction failed';
        throw new Error(`${errMsg}: ${result.err()}`);
    }
}

/**
 * Assert that a transaction result is a failure.
 * Throws if the result is null or successful.
 *
 * Useful for testing expected failures.
 *
 * @example
 * ```ts
 * const result = client.svm.sendTransaction(badTx);
 * assertIsFailedTransaction(result);
 * expect(result.err().toString()).toContain('InsufficientFunds');
 * ```
 */
export function assertIsFailedTransaction(
    result: TransactionResult | SendTransactionResult | SimulationResult,
    message?: string,
): asserts result is FailedTransactionMetadata {
    if (result === null) {
        throw new Error(message ?? 'Expected failed transaction but got null');
    }
    if (!('err' in result)) {
        throw new Error(message ?? 'Expected failed transaction but got successful result');
    }
}

// ============================================================================
// Simulation Type Guards
// ============================================================================

/**
 * Type guard: check if simulation result is successful (SimulatedTransactionInfo)
 *
 * @example
 * ```ts
 * const result = client.svm.simulateTransaction(tx);
 * if (isSuccessfulSimulation(result)) {
 *     console.log(result.meta().computeUnitsConsumed());
 *     console.log(result.postAccounts());
 * }
 * ```
 */
export function isSuccessfulSimulation(result: SimulationResult): result is SimulatedTransactionInfo {
    return !('err' in result);
}

// ============================================================================
// Simulation Assertions
// ============================================================================

/**
 * Assert that a simulation result is successful (SimulatedTransactionInfo).
 * Throws if the result is a FailedTransactionMetadata.
 *
 * @example
 * ```ts
 * const result = client.svm.simulateTransaction(tx);
 * assertIsSuccessfulSimulation(result);
 * console.log(result.meta().computeUnitsConsumed()); // result is SimulatedTransactionInfo
 * ```
 */
export function assertIsSuccessfulSimulation(
    result: SimulationResult,
    message?: string,
): asserts result is SimulatedTransactionInfo {
    if ('err' in result) {
        const errMsg = message ?? 'Simulation failed';
        throw new Error(`${errMsg}: ${result.err()}`);
    }
}

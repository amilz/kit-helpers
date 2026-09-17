import type { TransactionSigner } from '@solana/kit';

import { createTransactionBuilder } from './transaction-builder';
import type {
    TransactionBuilderBuilding,
    TransactionBuilderOptions,
    TransactionBuilderRpc,
    TransactionBuilderRpcSubscriptions,
} from './types';

/** Client type that has the required properties for the transaction builder plugin. */
type TransactionBuilderClient = {
    payer: TransactionSigner;
    rpc: TransactionBuilderRpc;
    rpcSubscriptions?: TransactionBuilderRpcSubscriptions;
};

/**
 * A plugin that adds a `createTransaction()` method to the client for building transactions.
 *
 * Requires the client to have:
 * - `rpc` - RPC instance with getLatestBlockhash, sendTransaction, simulateTransaction, etc.
 * - `payer` - TransactionSigner for paying transaction fees
 * - `rpcSubscriptions` (optional) - For sendAndConfirm functionality
 *
 * @param options - Optional configuration for default behavior.
 * @param options.autoEstimateCus - Enable/disable auto-estimation of compute units. Default: true.
 * @param options.estimateMargin - Safety margin for CU estimation (e.g., 0.1 for 10%). Default: 0.1.
 * @param options.version - Transaction version to build, 0 or 1. Default: 1.
 *
 * @example
 * ```ts
 * import { createClient, lamports } from '@solana/kit';
 * import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
 * import { transactionBuilderPlugin } from '@solana/transaction-builder';
 *
 * const client = await createClient()
 *   .use(localhostRpc())
 *   .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *   .use(transactionBuilderPlugin());
 *
 * // Build and send a version 1 transaction (the default)
 * const signature = await client
 *   .createTransaction()
 *   .add(transferInstruction)
 *   .setComputeLimit(200_000)
 *   .setPriorityFeeLamports(5_000n)
 *   .execute();
 *
 * // Version 0 transactions
 * const v0Client = await createClient()
 *   .use(localhostRpc())
 *   .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *   .use(transactionBuilderPlugin({ version: 0 }));
 *
 * const v0Signature = await v0Client
 *   .createTransaction()
 *   .add(transferInstruction)
 *   .setPriorityFee(1_000_000n)
 *   .execute();
 *
 * // With custom defaults
 * const clientWithOptions = await createClient()
 *   .use(localhostRpc())
 *   .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *   .use(transactionBuilderPlugin({ autoEstimateCus: false, estimateMargin: 0.2 }));
 * ```
 */
export function transactionBuilderPlugin(options?: TransactionBuilderOptions) {
    return <T extends TransactionBuilderClient>(client: T) => ({
        ...client,
        /**
         * Create a new transaction builder.
         */
        createTransaction(): TransactionBuilderBuilding {
            return createTransactionBuilder(
                {
                    payer: client.payer,
                    rpc: client.rpc,
                    rpcSubscriptions: client.rpcSubscriptions,
                },
                options,
            );
        },
    });
}

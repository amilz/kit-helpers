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
 *
 * @example
 * ```ts
 * import { createEmptyClient, lamports } from '@solana/kit';
 * import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
 * import { transactionBuilderPlugin } from '@solana/transaction-builder';
 *
 * const client = await createEmptyClient()
 *   .use(localhostRpc())
 *   .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *   .use(transactionBuilderPlugin());
 *
 * // Build and send a transaction
 * const signature = await client
 *   .createTransaction()
 *   .add(transferInstruction)
 *   .setComputeLimit(200_000)
 *   .setPriorityFee(1_000_000n)
 *   .execute();
 *
 * // With custom defaults
 * const clientWithOptions = await createEmptyClient()
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

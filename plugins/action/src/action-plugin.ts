import { createActionNamespace } from './action';
import type { ActionClientRequirements, ActionNamespace, ActionPluginOptions } from './types';

/**
 * A plugin that adds an `action` namespace for transaction lifecycle operations.
 *
 * Requires the client to have:
 * - `rpc` - RPC instance for sending/simulating transactions
 * - At least one signer source: `payer` (TransactionSigner) or `wallet` (connected wallet)
 *
 * Optionally:
 * - `rpcSubscriptions` - When present, `send()` and `sendSigned()` confirm transactions
 *   via subscription. When absent, they return the signature immediately (fire-and-forget).
 *
 * @example
 * ```ts
 * import { createSolanaRpc } from '@solana/kit';
 * import { actionPlugin } from '@kit-helpers/action';
 *
 * // With a payer (scripting/testing)
 * const client = createEmptyClient()
 *   .use(rpc('https://api.devnet.solana.com'))
 *   .use(payer(myKeypair))
 *   .use(actionPlugin());
 *
 * // With a wallet (browser)
 * const client = createEmptyClient()
 *   .use(rpc('https://api.devnet.solana.com'))
 *   .use(walletPlugin({ connectors: autoDiscover() }))
 *   .use(actionPlugin());
 *
 * // Send a transaction
 * const sig = await client.action.send([transferInstruction]);
 *
 * // Simulate first
 * const sim = await client.action.simulate([ix1, ix2]);
 * if (!sim.error) {
 *   await client.action.send([ix1, ix2]);
 * }
 * ```
 */
export function actionPlugin(options?: ActionPluginOptions) {
    return <T extends ActionClientRequirements>(client: T): T & { action: ActionNamespace } => ({
        ...client,
        action: createActionNamespace(client, options),
    });
}

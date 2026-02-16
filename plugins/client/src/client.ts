import { actionPlugin } from '@kit-helpers/action';
import { systemProgramPlugin } from '@kit-helpers/program-system';
import { tokenProgramPlugin } from '@kit-helpers/program-token';
import { queryPlugin } from '@kit-helpers/query';
import { walletPlugin } from '@kit-helpers/wallet';
import { createEmptyClient } from '@solana/kit';
import { defaultTransactionPlannerAndExecutorFromRpc, sendTransactions } from '@solana/kit-plugin-instruction-plan';
import { payer } from '@solana/kit-plugin-payer';
import { rpc } from '@solana/kit-plugin-rpc';

import type {
    PayerClientConfig,
    PayerSolanaClient,
    SolanaClientConfig,
    WalletClientConfig,
    WalletSolanaClient,
} from './types';

/**
 * Create a fully composed Solana client with all kit-helpers plugins.
 *
 * Provide `payer` for server/script usage or `wallet` for browser usage.
 *
 * @example
 * ```ts
 * // Server/script usage
 * const client = createSolanaClient({
 *   url: 'https://api.devnet.solana.com',
 *   payer: myKeypair,
 * });
 *
 * // Browser usage
 * const client = createSolanaClient({
 *   url: 'https://api.devnet.solana.com',
 *   wallet: { wallets: autoDiscover() },
 * });
 *
 * // Use the client
 * const balance = await client.query.balance(address).fn();
 * const ix = client.program.system.transfer({ destination, amount: 1_000_000n });
 * // Payer client: client.sendTransaction([ix])
 * // Wallet client: client.action.send([ix])
 * ```
 */
export function createSolanaClient(config: PayerClientConfig): PayerSolanaClient;
export function createSolanaClient(config: WalletClientConfig): WalletSolanaClient;
export function createSolanaClient(config: SolanaClientConfig): PayerSolanaClient | WalletSolanaClient {
    const rpcClient = createEmptyClient().use(rpc(config.url, config.wsUrl ? { url: config.wsUrl } : undefined));

    // Payer flow — payer is available immediately.
    if ('payer' in config && config.payer) {
        return rpcClient
            .use(payer(config.payer))
            .use(defaultTransactionPlannerAndExecutorFromRpc({ priorityFees: config.priorityFees }))
            .use(sendTransactions())
            .use(queryPlugin())
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    // Wallet flow — the action plugin resolves the signer lazily at call time,
    // so there's no need to inline send methods or cache planner/executor.
    if ('wallet' in config && config.wallet) {
        return rpcClient
            .use(walletPlugin(config.wallet))
            .use(actionPlugin({ computeUnitPrice: config.priorityFees }))
            .use(queryPlugin())
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    throw new Error('createSolanaClient requires either a `payer` or `wallet` config.');
}


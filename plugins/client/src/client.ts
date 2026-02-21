import { actionPlugin } from '@kit-helpers/action';
import { queryPlugin } from '@kit-helpers/query';
import { walletPlugin } from '@kit-helpers/wallet';
import { address, createEmptyClient } from '@solana/kit';
import {
    defaultTransactionPlannerAndExecutorFromRpc,
    planAndSendTransactions,
} from '@solana/kit-plugin-instruction-plan';
import { payer } from '@solana/kit-plugin-payer';
import { rpc } from '@solana/kit-plugin-rpc';
import { createNoopSigner } from '@solana/signers';
import type { SystemPlugin } from '@solana-program/system';
import { systemProgram } from '@solana-program/system';
import type { TokenPlugin } from '@solana-program/token';
import { tokenProgram } from '@solana-program/token';

import type {
    PayerClientConfig,
    PayerSolanaClient,
    SolanaClientConfig,
    WalletClientConfig,
    WalletSolanaClient,
} from './types';

/** Re-nests top-level `system` and `token` under a `program` namespace. */
function programPlugin() {
    return <T extends { system: SystemPlugin; token: TokenPlugin }>(client: T) => {
        const { system, token, ...rest } = client;
        return { ...rest, program: { system, token } };
    };
}

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
 * const ix = client.program.system.instructions.transferSol({ source: signer, destination, amount: 1_000_000n });
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
            .use(planAndSendTransactions())
            .use(queryPlugin())
            .use(systemProgram())
            .use(tokenProgram())
            .use(programPlugin());
    }

    // Wallet flow — uses a noop signer as placeholder payer so native program
    // plugins can be installed. The action plugin resolves the real wallet signer
    // lazily at call time via client.action.send([ix]).
    if ('wallet' in config && config.wallet) {
        return rpcClient
            .use(walletPlugin(config.wallet))
            .use(payer(createNoopSigner(address('11111111111111111111111111111111'))))
            .use(defaultTransactionPlannerAndExecutorFromRpc({ priorityFees: config.priorityFees }))
            .use(planAndSendTransactions())
            .use(actionPlugin({ computeUnitPrice: config.priorityFees }))
            .use(queryPlugin())
            .use(systemProgram())
            .use(tokenProgram())
            .use(programPlugin());
    }

    throw new Error('createSolanaClient requires either a `payer` or `wallet` config.');
}

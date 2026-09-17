import { actionPlugin } from '@kit-helpers/action';
import { queryPlugin } from '@kit-helpers/query';
import { walletPlugin } from '@kit-helpers/wallet';
import type { SystemPlugin } from '@solana-program/system';
import { systemProgram } from '@solana-program/system';
import type { TokenPlugin } from '@solana-program/token';
import { tokenProgram } from '@solana-program/token';
import { address, createClient } from '@solana/kit';
import { planAndSendTransactions } from '@solana/kit-plugin-instruction-plan';
import { payer } from '@solana/kit-plugin-payer';
import type { TransactionPlannerConfig } from '@solana/kit-plugin-rpc';
import { rpc, rpcGetMinimumBalance, rpcTransactionPlanExecutor, rpcTransactionPlanner } from '@solana/kit-plugin-rpc';
import { createNoopSigner } from '@solana/signers';

import type {
    PayerClientConfig,
    PayerSolanaClient,
    SolanaClientConfig,
    WalletClientConfig,
    WalletSolanaClient,
} from './types';

/** Maps the client config onto the planner's per-version pricing options. */
function plannerConfig(config: SolanaClientConfig): TransactionPlannerConfig {
    const version = config.version ?? 1;

    if (version === 1) {
        if (config.priorityFees !== undefined) {
            throw new Error(
                'priorityFees prices priority per compute unit, which version 1 transactions do not ' +
                    'do. Use priorityFeeLamports to state a total in lamports, or pass version: 0.',
            );
        }
        return { priorityFeeLamports: config.priorityFeeLamports, version: 1 };
    }

    if (config.priorityFeeLamports !== undefined) {
        throw new Error(
            'priorityFeeLamports states a total priority fee, which only version 1 transactions ' +
                'carry. Use priorityFees to state a price per compute unit, or pass version: 1.',
        );
    }
    return { microLamportsPerComputeUnit: config.priorityFees, version: 0 };
}

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
    const rpcClient = createClient().use(rpc(config.url, config.wsUrl ? { url: config.wsUrl } : undefined));

    // Payer flow — payer is available immediately.
    if ('payer' in config && config.payer) {
        return rpcClient
            .use(payer(config.payer))
            .use(rpcTransactionPlanner(plannerConfig(config)))
            .use(rpcTransactionPlanExecutor())
            .use(planAndSendTransactions())
            .use(rpcGetMinimumBalance())
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
            .use(rpcTransactionPlanner(plannerConfig(config)))
            .use(rpcTransactionPlanExecutor())
            .use(planAndSendTransactions())
            .use(
                actionPlugin({
                    computeUnitPrice: config.priorityFees,
                    priorityFeeLamports: config.priorityFeeLamports,
                    version: config.version ?? 1,
                }),
            )
            .use(rpcGetMinimumBalance())
            .use(queryPlugin())
            .use(systemProgram())
            .use(tokenProgram())
            .use(programPlugin());
    }

    throw new Error('createSolanaClient requires either a `payer` or `wallet` config.');
}

import { actionPlugin } from '@kit-helpers/action';
import { systemProgramPlugin } from '@kit-helpers/program-system';
import { tokenProgramPlugin } from '@kit-helpers/program-token';
import { queryPlugin } from '@kit-helpers/query';
import { walletPlugin } from '@kit-helpers/wallet';
import { createEmptyClient } from '@solana/kit';
import { payer, rpc } from '@solana/kit-plugins';
import type {
    PayerClientConfig,
    PayerSolanaClient,
    SolanaClient,
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
 *   wallet: { connectors: [phantom(), solflare()] },
 * });
 *
 * // Use the client
 * const balance = await client.query.balance(address).fn();
 * const ix = client.program.system.transfer({ destination, amount: 1_000_000n });
 * await client.action.send([ix]);
 * ```
 */
export function createSolanaClient(config: PayerClientConfig): PayerSolanaClient;
export function createSolanaClient(config: WalletClientConfig): WalletSolanaClient;
export function createSolanaClient(config: SolanaClientConfig): SolanaClient {
    const rpcClient = createEmptyClient().use(rpc(config.url));

    if ('wallet' in config) {
        return rpcClient
            .use(walletPlugin(config.wallet))
            .use(queryPlugin())
            .use(actionPlugin(config.action))
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    if ('payer' in config) {
        return rpcClient
            .use(payer(config.payer))
            .use(queryPlugin())
            .use(actionPlugin(config.action))
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    throw new Error('createSolanaClient requires either a `payer` or `wallet` config.');
}

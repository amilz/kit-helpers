import { actionPlugin } from '@kit-helpers/action';
import { systemProgramPlugin } from '@kit-helpers/program-system';
import { tokenProgramPlugin } from '@kit-helpers/program-token';
import { queryPlugin } from '@kit-helpers/query';
import { walletPlugin } from '@kit-helpers/wallet';
import { createEmptyClient } from '@solana/kit';
import { payer, rpc } from '@solana/kit-plugins';
import type { SolanaClient, SolanaClientConfig } from './types';

/**
 * Create a fully composed Solana client with all kit-helpers plugins.
 *
 * At least one of `payer` or `wallet` must be provided so that transactions
 * can be signed. Provide `payer` for server/script usage, `wallet` for
 * browser usage, or both.
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
export function createSolanaClient(config: SolanaClientConfig): SolanaClient {
    const rpcClient = createEmptyClient().use(rpc(config.url));

    // Branch on signer source so TypeScript tracks the full .use() chain per path.
    // SolanaClientConfig guarantees at least one of payer/wallet.
    if (config.payer && config.wallet) {
        return rpcClient
            .use(payer(config.payer))
            .use(walletPlugin(config.wallet))
            .use(queryPlugin())
            .use(actionPlugin(config.action))
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    if (config.payer) {
        return rpcClient
            .use(payer(config.payer))
            .use(queryPlugin())
            .use(actionPlugin(config.action))
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    if (config.wallet) {
        return rpcClient
            .use(walletPlugin(config.wallet!))
            .use(queryPlugin())
            .use(actionPlugin(config.action))
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    throw new Error('No signer source provided. Either provide a payer or wallet configuration.');
}

import type { Rpc } from '@solana/rpc';

import { createSurfnetCheatcodesRpc } from './surfnet-rpc';
import type { SurfnetCheatcodesApi } from './types';

const DEFAULT_ENDPOINT = 'http://127.0.0.1:8899';

/**
 * Kit plugin that adds Surfnet cheatcode capabilities to a client.
 *
 * Compose with `localhostRpc()` or `createLocalClient()` for the
 * standard Solana RPC — this plugin only adds `client.surfnet`.
 *
 * @example
 * ```ts
 * import { createEmptyClient } from '@solana/kit';
 * import { localhostRpc } from '@solana/kit-plugin-rpc';
 * import { surfpool } from '@kit-helpers/surfpool';
 *
 * const client = createEmptyClient()
 *     .use(localhostRpc())
 *     .use(surfpool());
 *
 * // Standard Solana RPC (from localhostRpc)
 * const { value: balance } = await client.rpc.getBalance(address).send();
 *
 * // Surfnet cheatcodes (from surfpool)
 * await client.surfnet.timeTravel({ absoluteEpoch: 1000 }).send();
 * ```
 */
export function surfpool(config?: { url?: string }) {
    const surfnet = createSurfnetCheatcodesRpc(config?.url ?? DEFAULT_ENDPOINT);
    return <T extends object>(client: T): T & { surfnet: Rpc<SurfnetCheatcodesApi> } => ({
        ...client,
        surfnet,
    });
}

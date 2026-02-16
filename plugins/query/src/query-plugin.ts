import { createQueryNamespace } from './query';
import type { QueryClientRequirements, QueryNamespace } from './types';

/**
 * A plugin that adds a `query` namespace with framework-agnostic query definitions.
 *
 * Requires the client to have:
 * - `rpc` - RPC instance with getBalance, getAccountInfo, getProgramAccounts, etc.
 *
 * @example
 * ```ts
 * import { createSolanaRpc } from '@solana/kit';
 * import { queryPlugin } from '@kit-helpers/query';
 *
 * // Create RPC client
 * const rpc = createSolanaRpc('https://api.devnet.solana.com');
 *
 * // Apply plugin to client object
 * const client = queryPlugin()({ rpc });
 *
 * // Use query definitions - direct execution
 * const balanceQuery = client.query.balance(address);
 * const balance = await balanceQuery.fn();
 *
 * // Or pass to any framework adapter:
 * // TanStack Query: const { data } = useQuery(balanceQuery);
 * // SWR: const { data } = useSWR(balanceQuery.key, balanceQuery.fn);
 * ```
 */
export function queryPlugin() {
    return <T extends QueryClientRequirements>(client: T): T & { query: QueryNamespace } => ({
        ...client,
        query: createQueryNamespace(client),
    });
}

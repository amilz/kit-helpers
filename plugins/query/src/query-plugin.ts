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
 * import { createSolanaClient, rpc } from '@solana/kit-plugins';
 * import { queryPlugin } from '@kit-helpers/query';
 *
 * const client = createSolanaClient()
 *   .use(rpc('https://api.devnet.solana.com'))
 *   .use(queryPlugin());
 *
 * // Vanilla JS - direct execution
 * const balanceQuery = client.query.balance(address);
 * const balance = await balanceQuery.fn();
 *
 * // The query definition can be passed to any framework adapter:
 * // TanStack Query:
 * // const { data } = useQuery(balanceQuery);
 * //
 * // SWR:
 * // const { data } = useSWR(balanceQuery.key, balanceQuery.fn);
 * ```
 */
export function queryPlugin() {
    return <T extends QueryClientRequirements>(client: T): T & { query: QueryNamespace } => ({
        ...client,
        query: createQueryNamespace(client),
    });
}

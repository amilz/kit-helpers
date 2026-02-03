# Query Plugin Context

## What Was Built

`@kit-helpers/query` - Framework-agnostic query layer returning `QueryDef<T>` objects.

### QueryDef Pattern
```ts
type QueryDef<T> = {
  key: readonly unknown[];  // Cache key for TanStack/SWR/etc
  fn: () => Promise<T>;     // Fetch function
  staleTime?: number;       // Suggested cache duration (ms)
}
```

### Query Methods
- `balance(address)` → `QueryDef<Lamports>` (10s stale)
- `tokenBalance(ata)` → `QueryDef<TokenBalance>` (10s stale)
- `account(address, decoder?)` → `QueryDef<AccountInfo | null>` (30s stale)
- `signatureStatus(sig)` → `QueryDef<SignatureStatus | null>` (2s stale)
- `programAccounts(programId, opts?)` → `QueryDef<ProgramAccount[]>` (60s stale)

### Usage
```ts
import { queryPlugin } from '@kit-helpers/query';

const client = { rpc }.use(queryPlugin());

// Get query def
const balanceQuery = client.query.balance(addr);

// Execute directly
const balance = await balanceQuery.fn();

// Or pass to framework
const { data } = useQuery(balanceQuery);  // TanStack
const { data } = useSWR(balanceQuery.key, balanceQuery.fn);  // SWR
```

## Key Decisions
- Requires `rpc` on client (peer dep: @solana/kit ^5.2.0)
- Simple `Decoder<T>` type (just `decode` method) vs full Codec
- base64 decoding handled internally for account data
- Multi-platform: node/browser/react-native builds + tests

## Files
```
plugins/query/
├── src/
│   ├── index.ts          # Exports
│   ├── query-plugin.ts   # Plugin wrapper
│   ├── query.ts          # Core impl (createQueryNamespace)
│   └── types.ts          # All type definitions
├── test/
│   └── index.test.ts     # 21 tests × 3 platforms
├── package.json
├── tsconfig.json
├── tsconfig.declarations.json
├── tsup.config.ts
└── vitest.config.mts
```

## Next Steps (from architecture doc)
1. `action()` plugin - mutations (sendTransaction, etc)
2. `wallet()` plugin - wallet connection
3. `program.*` plugins - program-specific queries/actions
4. Framework adapters (tanstack, swr, svelte, vue)

## Gotchas Encountered
- `getProgramAccounts` returns array directly, not `{ value: [] }`
- @solana/kit's `Codec` type is complex; created simpler `Decoder<T>`
- `SignatureNotificationResult` not exported; created custom `SignatureStatus`
- `rentEpoch` not on response; use `space` directly

# @kit-helpers/query

Framework-agnostic query layer for `@solana/kit`. Returns `QueryDef<T>` objects consumable by any framework (TanStack Query, SWR, Svelte stores, etc).

## Installation

```bash
pnpm add @kit-helpers/query @solana/kit
```

## Usage

```ts
import { queryPlugin } from '@kit-helpers/query';

const client = { rpc }.use(queryPlugin());

// Get a query definition
const balanceQuery = client.query.balance(address);

// Execute directly
const balance = await balanceQuery.fn();

// Or pass to your framework of choice
const { data } = useQuery(balanceQuery);  // TanStack Query
const { data } = useSWR(balanceQuery.key, balanceQuery.fn);  // SWR
```

## QueryDef Pattern

All query methods return a `QueryDef<T>`:

```ts
type QueryDef<T> = {
  key: readonly unknown[];  // Cache key
  fn: () => Promise<T>;     // Fetch function
  staleTime?: number;       // Suggested cache duration (ms)
}
```

## Query Methods

| Method | Return Type | Stale Time |
|--------|-------------|------------|
| `balance(address)` | `QueryDef<Lamports>` | 10s |
| `tokenBalance(ata)` | `QueryDef<TokenBalance>` | 10s |
| `account(address, decoder?)` | `QueryDef<AccountInfo \| null>` | 30s |
| `signatureStatus(signature)` | `QueryDef<SignatureStatus \| null>` | 2s |
| `programAccounts(programId, options?)` | `QueryDef<ProgramAccount[]>` | 60s |

### Decoding Account Data

Pass an optional decoder to `account()` or `programAccounts()`:

```ts
const decoder = { decode: (data: Uint8Array) => mySchema.decode(data) };
const accountQuery = client.query.account(address, decoder);
```

## Requirements

- `@solana/kit` ^5.2.0 as peer dependency
- Client must have `rpc` property

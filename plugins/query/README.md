# @kit-helpers/query

Framework-agnostic query layer for `@solana/kit`. Returns `QueryDef<T>` objects consumable by any framework (TanStack Query, SWR, Svelte stores, etc).

## Installation

```bash
pnpm add @kit-helpers/query @solana/kit
```

## Usage

```ts
import { createSolanaRpc } from '@solana/kit';
import { queryPlugin } from '@kit-helpers/query';

// Create RPC client
const rpc = createSolanaRpc('https://api.devnet.solana.com');

// Apply plugin to client object
const client = queryPlugin()({ rpc });

// Get a query definition
const balanceQuery = client.query.balance(address);

// Execute directly
const balance = await balanceQuery.fn();

// Or pass to your framework of choice
// TanStack Query: const { data } = useQuery(balanceQuery);
// SWR: const { data } = useSWR(balanceQuery.key, balanceQuery.fn);
```

## QueryDef Pattern

All query methods return a `QueryDef<T>`:

```ts
type QueryDef<T> = {
    key: readonly unknown[]; // Cache key
    fn: () => Promise<T>; // Fetch function
    staleTime?: number; // Suggested cache duration (ms)
};
```

## Query Methods

| Method                                 | Return Type                         | Stale Time |
| -------------------------------------- | ----------------------------------- | ---------- |
| `balance(address)`                     | `QueryDef<Lamports>`                | 10s        |
| `tokenBalance(ata)`                    | `QueryDef<TokenBalance>`            | 10s        |
| `tokenBalance(mint, owner)`            | `QueryDef<TokenBalance>`            | 10s        |
| `account(address, decoder?)`           | `QueryDef<AccountInfo \| null>`     | 30s        |
| `signatureStatus(signature)`           | `QueryDef<SignatureStatus \| null>` | 2s         |
| `programAccounts(programId, options?)` | `QueryDef<ProgramAccount[]>`        | 60s        |

### Token Balance

Query token balance with either an ATA address directly, or derive the ATA from mint + owner:

```ts
// Option 1: Pass ATA directly
const balanceQuery = client.query.tokenBalance(ataAddress);

// Option 2: Pass mint + owner (derives ATA automatically)
const balanceQuery = client.query.tokenBalance(usdcMint, walletOwner);
```

### Decoding Account Data

Pass an optional decoder to `account()` or `programAccounts()`:

```ts
const decoder = myProgramAccountDecoder(); // e.g., getMintDecoder()
const accountQuery = client.query.account(address, decoder);
```

## Requirements

- `@solana/kit` ^5.2.0 as peer dependency
- `@solana-program/token` ^0.9.0 as peer dependency (for ATA derivation)
- Client must have `rpc` property

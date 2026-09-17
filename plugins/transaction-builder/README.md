# @kit-helpers/transaction-builder

Fluent API for building, signing, and sending Solana transactions with `@solana/kit`.

## Usage

### With Plugin

```ts
import { createSolanaClient } from '@solana/kit';
import { transactionBuilderPlugin } from '@kit-helpers/transaction-builder';

const client = createSolanaClient({ ... })
  .use(transactionBuilderPlugin());

const signature = await client
  .createTransaction()
  .add(transferInstruction)
  .setPriorityFeeLamports(5_000n)
  .execute();
```

### Without Plugin

```ts
import { createTransactionBuilder } from '@kit-helpers/transaction-builder';

const signature = await createTransactionBuilder({ rpc, rpcSubscriptions, payer }).add(transferInstruction).execute();
```

## API

### Building State

| Method                                  | Description                                    |
| --------------------------------------- | ---------------------------------------------- |
| `add(instruction)`                      | Add single instruction                         |
| `addMany(instructions)`                 | Add multiple instructions                      |
| `setPriorityFee(microLamports)`         | Set priority fee per CU (version 0)            |
| `setPriorityFeeLamports(lamports)`      | Set total priority fee (version 1)             |
| `setComputeLimit(units)`                | Set manual CU limit                            |
| `setLoadedAccountsDataSizeLimit(bytes)` | Set loaded account data limit (version 1)      |
| `setEstimateMargin(margin)`             | Set CU estimate buffer (default: 0.1)          |
| `autoEstimateCus(enabled)`              | Toggle auto CU estimation (default: true)      |
| `useNonce(config)`                      | Use durable nonce instead of blockhash         |
| `prepare()`                             | Fetch blockhash, estimate CUs → Prepared state |
| `execute(options?)`                     | Prepare + sign + send + confirm in one call    |

### Prepared State

| Method              | Description                          |
| ------------------- | ------------------------------------ |
| `getMessage()`      | Get the transaction message          |
| `simulate(config?)` | Simulate without sending             |
| `sign()`            | Sign with all signers → Signed state |

### Signed State

| Method                     | Description                    |
| -------------------------- | ------------------------------ |
| `getTransaction()`         | Get the signed transaction     |
| `send(options?)`           | Send without confirmation      |
| `sendAndConfirm(options?)` | Send and wait for confirmation |

### Options

```ts
// Builder options (plugin or createTransactionBuilder)
type TransactionBuilderOptions = {
    autoEstimateCus?: boolean; // default: true
    estimateMargin?: number; // default: 0.1 (10%)
    minPriorityFee?: bigint; // default: 0n (version 0 only)
    minPriorityFeeLamports?: bigint; // default: 0n (version 1 only)
    version?: 0 | 1; // default: 1
};

// Send options
type SendOptions = {
    commitment?: Commitment; // default: 'confirmed'
    skipPreflight?: boolean;
    abortSignal?: AbortSignal;
};
```

## Transaction Versions

**Version 1 is the default.** It may be up to 4096 bytes instead of 1232 and
carries its resource limits and priority fee in the message config rather than in
ComputeBudget instructions. It requires a cluster with the `txv1` feature gate
active (mainnet, devnet, testnet, and `solana-test-validator` 4.2+) and cannot use
address lookup tables.

Both the compute unit limit and the loaded accounts data size limit default to
zero on version 1. Whichever is not set explicitly is estimated by simulation:
the compute unit limit gets `estimateMargin` on top, and the data size limit is
rounded up to a whole 32 KiB page. With `autoEstimateCus` off, both must be set.

`setPriorityFee`/`minPriorityFee` (micro-lamports per CU) are version 0 only;
`setPriorityFeeLamports`/`minPriorityFeeLamports` (total lamports) are version 1
only. Passing the wrong one throws.

Pass `version: 0` for a cluster without the feature gate or a transaction that
needs lookup tables:

```ts
const client = createSolanaClient({ ... })
  .use(transactionBuilderPlugin({ version: 0 }));

const signature = await client
  .createTransaction()
  .add(transferInstruction)
  .setPriorityFee(1_000_000n)
  .execute();
```

Reading a version 1 transaction back requires `maxSupportedTransactionVersion: 1`
on `getTransaction` and `getBlock`; its limits appear under `transactionConfig`.

## Durable Nonce

```ts
const signature = await client
    .newTransaction()
    .add(instruction)
    .useNonce({
        nonce,
        nonceAccountAddress,
        nonceAuthorityAddress,
    })
    .execute();
```

## License

MIT

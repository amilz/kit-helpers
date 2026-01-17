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
  .setPriorityFee(1_000_000n)
  .execute();
```

### Without Plugin

```ts
import { createTransactionBuilder } from '@kit-helpers/transaction-builder';

const signature = await createTransactionBuilder({ rpc, rpcSubscriptions, payer }).add(transferInstruction).execute();
```

## API

### Building State

| Method                          | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `add(instruction)`              | Add single instruction                         |
| `addMany(instructions)`         | Add multiple instructions                      |
| `setPriorityFee(microLamports)` | Set priority fee per CU                        |
| `setComputeLimit(units)`        | Set manual CU limit                            |
| `setEstimateMargin(margin)`     | Set CU estimate buffer (default: 0.1)          |
| `autoEstimateCus(enabled)`      | Toggle auto CU estimation (default: true)      |
| `useNonce(config)`              | Use durable nonce instead of blockhash         |
| `prepare()`                     | Fetch blockhash, estimate CUs → Prepared state |
| `execute(options?)`             | Prepare + sign + send + confirm in one call    |

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
    minPriorityFee?: bigint; // default: 0n
};

// Send options
type SendOptions = {
    commitment?: Commitment; // default: 'confirmed'
    skipPreflight?: boolean;
    abortSignal?: AbortSignal;
};
```

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

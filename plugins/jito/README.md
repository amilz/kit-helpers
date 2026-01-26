# @kit-helpers/jito

Jito bundle plugin for `@solana/kit` - bundle submission, tip accounts, and MEV protection.

## Installation

```bash
pnpm add @kit-helpers/jito
```

## Usage

### With Plugin

```ts
import { createSolanaClient } from '@solana/kit';
import { jitoPlugin } from '@kit-helpers/jito';

const client = createSolanaClient({ ... })
  .use(jitoPlugin({
    endpoint: 'https://mainnet.block-engine.jito.wtf/api/v1',
    uuid: 'optional-auth-uuid', // increases rate limits
  }));

// Get tip accounts
const tipAccounts = await client.jito.getTipAccounts();

// Send a bundle
const bundleId = await client.jito
  .createBundle()
  .add(encodedTx1)
  .add(encodedTx2)
  .send();

// Check status
const statuses = await client.jito.getInflightBundleStatuses([bundleId]);
```

### Without Plugin

```ts
import { createJitoClient } from '@kit-helpers/jito';

const jito = createJitoClient({
    endpoint: 'https://mainnet.block-engine.jito.wtf/api/v1',
});

const tipAccounts = await jito.getTipAccounts();
```

## API

### Core Methods

| Method                                 | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| `getTipAccounts()`                     | Get list of 8 Jito tip account addresses    |
| `getRandomTipAccount()`                | Get a random tip account (secure random)    |
| `sendBundle(bundle)`                   | Send bundle of up to 5 transactions         |
| `getBundleStatuses(bundleIds)`         | Get status of landed bundles (max 5 IDs)    |
| `getInflightBundleStatuses(bundleIds)` | Get status of in-flight bundles (max 5 IDs) |
| `sendTransaction(tx, options?)`        | Send single transaction via Jito            |
| `simulateBundle(bundle, options?)`     | Simulate bundle without submitting          |
| `createBundle()`                       | Create a fluent bundle builder              |

### Bundle Builder

```ts
const bundleId = await client.jito
    .createBundle()
    .add(encodedTx1) // Add single transaction
    .addMany([tx2, tx3]) // Add multiple transactions
    .send(); // Send to Jito

// Or simulate first
const result = await client.jito.createBundle().add(encodedTx1).simulate();

if (result.summary === 'succeeded') {
    // Safe to send
}
```

### Types

```ts
type JitoPluginConfig = {
    endpoint: string; // Jito Block Engine URL (required)
    uuid?: string; // Optional UUID for higher rate limits
};

type SendTransactionOptions = {
    encoding?: 'base58' | 'base64'; // default: 'base64'
    skipPreflight?: boolean;
};

type SimulateBundleOptions = {
    simulationBank?: 'processed' | 'confirmed' | 'finalized';
    skipSigVerify?: boolean;
    replaceRecentBlockhash?: boolean;
};

type InflightBundleStatus = {
    bundle_id: string;
    status: 'Invalid' | 'Pending' | 'Failed' | 'Landed';
    landed_slot?: bigint;
};
```

## Jito Endpoints

| Region    | Mainnet Endpoint                                  |
| --------- | ------------------------------------------------- |
| Amsterdam | `https://amsterdam.mainnet.block-engine.jito.wtf` |
| Frankfurt | `https://frankfurt.mainnet.block-engine.jito.wtf` |
| New York  | `https://ny.mainnet.block-engine.jito.wtf`        |
| Tokyo     | `https://tokyo.mainnet.block-engine.jito.wtf`     |

Add `/api/v1` for bundles or `/api/v1/transactions` for single transactions.

## Bundle Requirements

- **Max 5 transactions** per bundle
- **Base64 encoding** - transactions must be base64 encoded wire transactions
- **Tip required** - include a transfer to a tip account in one of your transactions
- **Minimum tip**: 1000 lamports (check current tip floor for competitive pricing)
- **Atomic execution** - all transactions succeed or all revert

## Example: Bundle with Tip

```ts
import { getTransferSolInstruction } from '@solana-program/system';

// Get a random tip account
const tipAccount = await client.jito.getRandomTipAccount();

// Create tip instruction (add to your last transaction)
const tipIx = getTransferSolInstruction({
    source: payer,
    destination: tipAccount,
    amount: 1_000_000n, // 0.001 SOL tip
});

// Build your transaction with the tip, sign it, encode it
// Then add to bundle and send
const bundleId = await client.jito.createBundle().add(encodedTxWithTip).send();
```

## Helpers

```ts
import {
    getRandomTipAccount, // Select random from array (crypto-secure)
    validateBundle, // Validate bundle size
    MAX_BUNDLE_SIZE, // 5
    MIN_TIP_LAMPORTS, // 1000n
} from '@kit-helpers/jito';
```

## License

MIT

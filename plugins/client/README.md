# @kit-helpers/client

Batteries-included Solana client that composes all kit-helpers plugins into a single factory function.

## Installation

```bash
pnpm add @kit-helpers/client @solana/kit
```

## Usage

### Server / Scripts

```ts
import { createSolanaClient } from '@kit-helpers/client';

const client = createSolanaClient({
    url: 'https://api.devnet.solana.com',
    payer: myKeypair,
});

// Query
const balance = await client.query.balance(address).fn();

// Build instructions
const ix = client.program.system.transfer({
    destination: recipientAddress,
    amount: 1_000_000n,
});

// Send transaction
await client.action.send([ix]);
```

### Browser

```ts
import { createSolanaClient } from '@kit-helpers/client';
import { phantom, solflare } from '@kit-helpers/wallet/connectors';

const client = createSolanaClient({
    url: 'https://api.devnet.solana.com',
    wallet: { connectors: [phantom(), solflare()] },
});

// Connect wallet
await client.wallet.connect('phantom');

// Everything else works the same
const ix = client.program.token.transfer({
    source,
    destination,
    authority,
    amount: 1_000_000n,
});
await client.action.send([ix]);
```

## What's Included

`createSolanaClient` composes these plugins automatically:

| Namespace                 | Plugin                        | Description                             |
| ------------------------- | ----------------------------- | --------------------------------------- |
| `client.rpc`              | `@solana/kit-plugins`         | RPC and subscriptions                   |
| `client.payer`            | —                             | Transaction signer (server)             |
| `client.wallet`           | `@kit-helpers/wallet`         | Wallet adapter (browser)                |
| `client.query.*`          | `@kit-helpers/query`          | Balance, token balance, account queries |
| `client.action.*`         | `@kit-helpers/action`         | Send, simulate, sign transactions       |
| `client.program.system.*` | `@kit-helpers/program-system` | System program instructions             |
| `client.program.token.*`  | `@kit-helpers/program-token`  | Token program instructions              |

## Config

`createSolanaClient` accepts one of two mutually exclusive configs:

```ts
// Server / scripts
type PayerClientConfig = {
    url: ClusterUrl;
    payer: TransactionSigner;
    action?: ActionPluginOptions;
};

// Browser
type WalletClientConfig = {
    url: ClusterUrl;
    wallet: { connectors: WalletConnector[] };
    action?: ActionPluginOptions;
};
```

Return types are narrowed per config — `PayerSolanaClient` guarantees `.payer`, `WalletSolanaClient` guarantees `.wallet`.

## Why `@kit-helpers/action` instead of `@solana/kit-plugin-instruction-plan`?

The payer flow uses kit's native `sendTransactions()` plugin from `@solana/kit-plugin-instruction-plan`, which provides `TransactionPlanner`/`TransactionPlanExecutor` for automatic instruction-to-transaction splitting.

The wallet flow uses `@kit-helpers/action` instead because the native plugin eagerly spreads the client (`{ ...client }`) at composition time, which invokes property getters before a wallet is connected. Since the wallet signer isn't available until `connect()` is called, this causes the plugin to capture a `null` payer. The action plugin avoids this by resolving the signer lazily at call time.

This is something we'd like to improve upstream in `@solana/kit-plugin-instruction-plan` — if the native plugin supported lazy signer resolution, both flows could share the same send path.

## Using Plugins Individually

If you don't need everything, use plugins directly:

```ts
import { createEmptyClient } from '@solana/kit';
import { rpc } from '@solana/kit-plugins';
import { queryPlugin } from '@kit-helpers/query';
import { systemProgramPlugin } from '@kit-helpers/program-system';

const client = createEmptyClient()
    .use(rpc('https://api.devnet.solana.com'))
    .use(queryPlugin())
    .use(systemProgramPlugin());
```

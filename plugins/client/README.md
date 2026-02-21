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

// Build instructions (explicit signer required)
const ix = client.program.system.instructions.transferSol({
    source: myKeypair,
    destination: recipientAddress,
    amount: 1_000_000n,
});

// Send transaction
await client.sendTransaction([ix]);
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
const ix = client.program.token.instructions.transfer({
    source,
    destination,
    authority,
    amount: 1_000_000n,
});
await client.action.send([ix]);
```

## What's Included

`createSolanaClient` composes these plugins automatically:

| Namespace                 | Plugin                   | Description                             |
| ------------------------- | ------------------------ | --------------------------------------- |
| `client.rpc`              | `@solana/kit-plugins`    | RPC and subscriptions                   |
| `client.payer`            | —                        | Transaction signer (server)             |
| `client.wallet`           | `@kit-helpers/wallet`    | Wallet adapter (browser)                |
| `client.query.*`          | `@kit-helpers/query`     | Balance, token balance, account queries |
| `client.action.*`         | `@kit-helpers/action`    | Send, simulate, sign transactions       |
| `client.program.system.*` | `@solana-program/system` | System program instructions & accounts  |
| `client.program.token.*`  | `@solana-program/token`  | Token program instructions & accounts   |

## Config

`createSolanaClient` accepts one of two mutually exclusive configs:

```ts
// Server / scripts
type PayerClientConfig = {
    url: ClusterUrl;
    payer: TransactionSigner;
    priorityFees?: MicroLamports;
};

// Browser
type WalletClientConfig = {
    url: ClusterUrl;
    wallet: { wallets: UiWallet[] };
    priorityFees?: MicroLamports;
};
```

Return types are narrowed per config — `PayerSolanaClient` guarantees `.payer`, `WalletSolanaClient` guarantees `.wallet`.

## How the Wallet Flow Works

Native program plugins (`systemProgram()`, `tokenProgram()`) require a payer, transaction planner, and executor at install time. The payer flow satisfies these naturally.

For the wallet flow, we install a **noop signer** as a placeholder payer along with the planner/executor plugins. This allows native program plugins to be composed normally. The noop signer is never used for real signing — wallet users send transactions via `client.action.send([ix])`, which resolves the real wallet signer lazily at call time.

## Using Plugins Individually

If you don't need everything, use plugins directly:

```ts
import { createEmptyClient } from '@solana/kit';
import { rpc } from '@solana/kit-plugins';
import { queryPlugin } from '@kit-helpers/query';
import { systemProgram } from '@solana-program/system';

const client = createEmptyClient().use(rpc('https://api.devnet.solana.com')).use(queryPlugin()).use(systemProgram());
```

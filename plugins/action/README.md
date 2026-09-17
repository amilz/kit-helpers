# @kit-helpers/action

Transaction lifecycle plugin for `@solana/kit`. Send, simulate, sign — one-liners over instructions.

## Installation

```bash
pnpm add @kit-helpers/action @solana/kit
```

## Usage

```ts
import { createEmptyClient } from '@solana/kit';
import { actionPlugin } from '@kit-helpers/action';

const client = createEmptyClient()
    .use(rpc('https://api.devnet.solana.com'))
    .use(payer(myKeypair)) // or .use(walletPlugin(...))
    .use(actionPlugin());

// Send a transaction (sign + send + confirm)
const sig = await client.action.send([transferInstruction]);

// Simulate first
const sim = await client.action.simulate([ix1, ix2]);
if (!sim.error) {
    await client.action.send([ix1, ix2]);
}

// Sign without sending
const signed = await client.action.sign([ix1, ix2]);

// Send pre-signed
const sig = await client.action.sendSigned(signed);

// Sign a message
const sigBytes = await client.action.signMessage(new Uint8Array([1, 2, 3]));
```

## API

### `actionPlugin(options?)`

| Option                        | Type         | Default       | Description                              |
| ----------------------------- | ------------ | ------------- | ---------------------------------------- |
| `commitment`                  | `Commitment` | `'confirmed'` | Default commitment for send confirmation |
| `computeUnitLimit`            | `number`     | —             | Default compute unit limit               |
| `computeUnitPrice`            | `bigint`     | —             | Priority fee per CU (version 0)          |
| `priorityFeeLamports`         | `bigint`     | —             | Total priority fee (version 1)           |
| `loadedAccountsDataSizeLimit` | `number`     | —             | Loaded account data limit (version 1)    |
| `version`                     | `0 \| 1`     | `1`           | Transaction version to build             |

### `client.action`

| Method                              | Return                       | Description            |
| ----------------------------------- | ---------------------------- | ---------------------- |
| `send(instructions, options?)`      | `Promise<Signature>`         | Sign + send + confirm  |
| `simulate(instructions, options?)`  | `Promise<SimulateResult>`    | Dry run                |
| `sign(instructions, options?)`      | `Promise<SignedTransaction>` | Sign only              |
| `sendSigned(transaction, options?)` | `Promise<Signature>`         | Send pre-signed tx     |
| `signMessage(message)`              | `Promise<SignatureBytes>`    | Sign arbitrary message |

### Confirmation behavior

- **With `rpcSubscriptions`**: `send()` and `sendSigned()` confirm via subscription before returning.
- **Without `rpcSubscriptions`**: Returns the signature immediately after sending (fire-and-forget).

### Signer resolution

The signer is resolved in this order:

1. `options.signer` (per-call override)
2. `client.wallet.session.signer` (connected wallet)
3. `client.payer` (scripting/testing)

### Send options

| Option          | Type                | Description                  |
| --------------- | ------------------- | ---------------------------- |
| `abortSignal`   | `AbortSignal`       | Cancel the operation         |
| `commitment`    | `Commitment`        | Override default commitment  |
| `skipPreflight` | `boolean`           | Skip preflight checks        |
| `signer`        | `TransactionSigner` | Override default signer      |
| `version`       | `0 \| 1`            | Transaction version to build |

### Transaction versions

**Version 1 is the default.** It carries the resource limits and priority fee in
the message config instead of ComputeBudget instructions, and raises the maximum
transaction size from 1232 to 4096 bytes. Limits left unset are estimated via
simulation.

```ts
await client.action.send([instruction], {
    computeUnitLimit: 100_000,
    loadedAccountsDataSizeLimit: 65_536,
    priorityFeeLamports: 5_000n,
});

// Version 0, for a cluster without the `txv1` feature gate or a transaction
// that needs address lookup tables.
await client.action.send([instruction], { computeUnitPrice: 1_000n, version: 0 });
```

When the signer is a connected wallet that does not advertise version 1, a call
without an explicit version is built as version 0; a call that asks for version 1
throws. `client.wallet.supportedTransactionVersions` lists what the wallet signs.

`computeUnitPrice` (micro-lamports per CU) is version 0 only and
`priorityFeeLamports` (total lamports) is version 1 only. Passing the wrong one
throws.

## Requirements

- `@solana/kit` ^8.3.0 as peer dependency
- Client must have `rpc` and either `payer` or `wallet`

## License

MIT

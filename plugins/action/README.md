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

| Option       | Type         | Default       | Description                              |
| ------------ | ------------ | ------------- | ---------------------------------------- |
| `commitment` | `Commitment` | `'confirmed'` | Default commitment for send confirmation |

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

| Option          | Type                | Description                 |
| --------------- | ------------------- | --------------------------- |
| `abortSignal`   | `AbortSignal`       | Cancel the operation        |
| `commitment`    | `Commitment`        | Override default commitment |
| `skipPreflight` | `boolean`           | Skip preflight checks       |
| `signer`        | `TransactionSigner` | Override default signer     |

## Requirements

- `@solana/kit` ^5.5.1 as peer dependency
- Client must have `rpc` and either `payer` or `wallet`

## License

MIT

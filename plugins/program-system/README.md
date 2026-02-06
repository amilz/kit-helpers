# @kit-helpers/program-system

System program plugin for `@solana/kit`. Adds `client.program.system.*` with convenient instruction builders.

## Installation

```bash
pnpm add @kit-helpers/program-system @solana-program/system @solana/kit
```

## Usage

### As a plugin

```ts
import { systemProgramPlugin } from '@kit-helpers/program-system';
import { createEmptyClient } from '@solana/kit';

const client = createEmptyClient()
  .use(rpc('https://api.devnet.solana.com'))
  .use(systemProgramPlugin());

const ix = client.program.system.transfer({
  destination: recipientAddress,
  amount: 1_000_000n,
});
```

### Standalone (without plugin)

```ts
import { createSystemProgramNamespace } from '@kit-helpers/program-system';

const system = createSystemProgramNamespace({ payer: myKeypair });
const ix = system.transfer({ destination, amount: 1_000_000n });
```

## API

All methods return an `Instruction`.

### `transfer({ destination, amount })`

Transfer SOL. Signer auto-resolved from wallet or payer.

### `createAccount({ newAccount, lamports, space, programAddress })`

Create a new account. Payer auto-resolved from wallet or payer.

### `allocate({ newAccount, space })`

Allocate space for an account.

### `assign({ account, programAddress })`

Assign an account to a program.

## Signer Resolution

When a signer is needed, the plugin resolves it automatically:

1. Connected wallet signer (`client.wallet.session.signer`)
2. Client payer (`client.payer`)
3. Throws if neither is available

# @kit-helpers/program-token

Token program plugin for `@solana/kit`. Adds `client.program.token.*` with convenient instruction builders.

## Installation

```bash
pnpm add @kit-helpers/program-token @solana-program/token @solana/kit
```

## Usage

### As a plugin

```ts
import { tokenProgramPlugin } from '@kit-helpers/program-token';
import { createEmptyClient } from '@solana/kit';

const client = createEmptyClient()
  .use(rpc('https://api.devnet.solana.com'))
  .use(tokenProgramPlugin());

const ix = client.program.token.transfer({
  source: sourceTokenAccount,
  destination: destTokenAccount,
  authority: ownerAddress,
  amount: 1_000_000n,
});
```

### Standalone (without plugin)

```ts
import { createTokenProgramNamespace } from '@kit-helpers/program-token';

const token = createTokenProgramNamespace({ payer: myKeypair });
const ix = token.transfer({ source, destination, authority, amount: 1_000_000n });
```

## API

All methods return an `Instruction` (except `createAtaAsync` which returns `Promise<Instruction>`).

### `transfer({ source, destination, authority, amount })`

Transfer tokens between token accounts.

### `transferChecked({ source, destination, mint, authority, amount, decimals })`

Transfer tokens with mint and decimal verification.

### `createAta({ payer, ata, owner, mint })`

Create an associated token account (sync — caller provides the ATA address).

### `createAtaAsync({ owner, mint, payer? })`

Create an associated token account (async — derives the ATA address automatically). Payer auto-resolved if omitted.

### `mintTo({ mint, token, mintAuthority, amount })`

Mint tokens to a token account.

### `burn({ account, mint, authority, amount })`

Burn tokens from a token account.

### `initializeMint({ mint, decimals, mintAuthority, freezeAuthority? })`

Initialize a mint account. Uses `InitializeMint2` (no separate rent sysvar needed).

## Signer Resolution

When a signer is needed (e.g., `createAtaAsync` payer), the plugin resolves it automatically:

1. Connected wallet signer (`client.wallet.session.signer`)
2. Client payer (`client.payer`)
3. Throws if neither is available

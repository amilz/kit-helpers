# @kit-helpers/airdrop-token

A `@solana/kit` plugin for quickly creating token mints with associated token accounts for testing purposes.

## Features

- Creates a token mint, ATA, and mints tokens in a single call
- Supports both Token Program and Token-2022 (extensions not yet supported)
- Configurable decimals, amounts, authorities, and mint keypairs
- Payer is used as mint authority by default

## Usage

```ts
import { createEmptyClient, lamports } from '@solana/kit';
import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
import { airdropToken } from '@kit-helpers/airdrop-token';

const client = await createEmptyClient()
    .use(localhostRpc())
    .use(generatedPayerWithSol(lamports(1_000_000_000n)))
    .use(airdropToken({ decimals: 6, amount: 1_000_000_000_000n }));

// Token is already created and accessible on the client
console.log(client.mint); // Address
console.log(client.ata); // Address
console.log(client.mintAuthority); // Address
```

### On-Demand Token Creation

Use `testTokenPlugin()` to add a `createTestToken()` method for creating tokens when needed.

```ts
import { createEmptyClient, lamports } from '@solana/kit';
import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
import { testTokenPlugin } from '@kit-helpers/airdrop-token';

const client = await createEmptyClient()
    .use(localhostRpc())
    .use(generatedPayerWithSol(lamports(1_000_000_000n)))
    .use(testTokenPlugin());

// Create tokens on demand
const { mint, ata, mintAuthority, signature } = await client.createTestToken();

// Create multiple tokens
const token2 = await client.createTestToken({ decimals: 6 });
const token3 = await client.createTestToken({ decimals: 0, amount: 100n });
```

### With LiteSVM

```ts
import { createEmptyClient } from '@solana/kit';
import { litesvm, generatedPayer } from '@solana/kit-plugins';
import { airdropToken } from '@kit-helpers/airdrop-token';

const client = await createEmptyClient().use(litesvm()).use(generatedPayer()).use(airdropToken());

console.log(client.mint);
```

### Custom Configuration

```ts
import { testTokenPlugin, TOKEN_2022_PROGRAM_ADDRESS } from '@kit-helpers/airdrop-token';

const result = await client.createTestToken({
    // Use Token-2022 instead of Token Program
    programId: TOKEN_2022_PROGRAM_ADDRESS,

    // 6 decimals (like USDC)
    decimals: 6,

    // Mint 1 million tokens
    amount: 1_000_000_000_000n,

    // Optional: custom freeze authority
    freezeAuthority: freezeAuthorityAddress,

    // Optional: use a specific mint keypair
    mintKeypair: myMintSigner,

    // Optional: use a different mint authority
    mintAuthority: customAuthoritySigner,
});
```

## API

### `airdropToken(config?)`

Creates a plugin that immediately creates a token during `.use()` and adds properties to the client. Similar to `airdrop()` but for tokens.

**Returns client with:**

- `mint: Address` - The mint address
- `ata: Address` - Payer's associated token account
- `mintAuthority: Address` - The mint authority address

### `testTokenPlugin()`

Creates a plugin that adds a `createTestToken` method to the client.

### `createTestToken(config?)`

Creates a token mint, initializes an ATA for the payer, and mints tokens.

**Config Options:**

| Option            | Type                | Default          | Description                     |
| ----------------- | ------------------- | ---------------- | ------------------------------- |
| `programId`       | `Address`           | Token Program    | Token program to use            |
| `decimals`        | `number`            | `9`              | Number of decimals for the mint |
| `amount`          | `bigint`            | `1_000_000_000n` | Amount of tokens to mint        |
| `mintAuthority`   | `TransactionSigner` | `payer`          | Mint authority signer           |
| `freezeAuthority` | `Address`           | `undefined`      | Optional freeze authority       |
| `mintKeypair`     | `KeyPairSigner`     | generated        | Custom mint keypair             |

**Returns:**

```ts
{
    mint: Address; // The mint address
    ata: Address; // Payer's associated token account
    mintAuthority: Address; // The mint authority address
    signature: Signature; // Transaction signature
}
```

**Client Requirements:**

- `payer: TransactionSigner` - Fee payer and default mint authority
- `rpc` + `rpcSubscriptions` (for RPC clients), or
- `svm` (for LiteSVM clients)

## Exports

```ts
// Plugins
export { airdropToken, testTokenPlugin } from '@kit-helpers/airdrop-token';

// Program addresses (re-exported for convenience)
export { TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS } from '@kit-helpers/airdrop-token';

// Types
export type {
    AirdropTokenClientProperties,
    CreateTestTokenFunction,
    TestTokenConfig,
    TestTokenResult,
    TokenProgramId,
} from '@kit-helpers/airdrop-token';
```

## License

MIT

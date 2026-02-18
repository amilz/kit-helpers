# @kit-helpers/asset

Asset plugin for `@solana/kit`. Provides typed, autocomplete-friendly access to well-known Solana addresses — token mints and program IDs.

## Installation

```bash
pnpm add @kit-helpers/asset @solana/kit
```

## Usage

### As a plugin

```ts
import { assetPlugin } from '@kit-helpers/asset';
import { createEmptyClient } from '@solana/kit';

const client = createEmptyClient().use(assetPlugin());

client.asset.usdc;          // Address<"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
client.asset.systemProgram; // Address<"11111111111111111111111111111111">
```

### With custom assets

```ts
import { address } from '@solana/kit';

const client = createEmptyClient().use(
    assetPlugin({
        custom: { myToken: address('CuSTomTokenAddress1111111111111111111111111') },
    }),
);

client.asset.myToken; // typed + autocomplete
client.asset.usdc;    // built-ins still available
```

### Standalone (without plugin)

```ts
import { createAssetNamespace } from '@kit-helpers/asset';

const assets = createAssetNamespace();
const mint = assets.usdc; // Address
```

### Dynamic lookup

```ts
const mint = client.asset.resolve('usdc'); // Address (throws on unknown)
```

## Built-in Assets

### Token Mints

| Name       | Address                                        |
| ---------- | ---------------------------------------------- |
| `usdc`     | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `usdt`     | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`  |
| `wsol`     | `So11111111111111111111111111111111111111112`     |
| `bonk`     | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` |
| `jitosol`  | `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn` |
| `jupSOL`   | `jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v`  |
| `msol`     | `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So`  |
| `pyusd`    | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` |

### Program IDs

| Name                    | Address                                        |
| ----------------------- | ---------------------------------------------- |
| `systemProgram`         | `11111111111111111111111111111111`                |
| `tokenProgram`          | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`   |
| `tokenProgram2022`      | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`   |
| `associatedTokenProgram`| `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`  |
| `memoProgram`           | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`   |
| `metadataProgram`       | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`   |

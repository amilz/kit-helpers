# @kit-helpers/wallet

Framework-agnostic wallet plugin for `@solana/kit` with Wallet Standard support.

## Features

- Zero framework dependencies (vanilla JS)
- Built on [Wallet Standard](https://github.com/wallet-standard/wallet-standard)
- State machine for connection status
- Subscribe pattern compatible with `useSyncExternalStore`
- Auto-discovers installed wallets

## Usage

### Basic Setup

```ts
import { createEmptyClient } from '@solana/kit';
import { walletPlugin, autoDiscover } from '@kit-helpers/wallet';

const client = createEmptyClient().use(walletPlugin({ connectors: autoDiscover() }));
```

### Connecting

```ts
// List available wallets
console.log(client.wallet.connectors);

// Connect to a wallet
await client.wallet.connect('phantom');

// Access connected state
console.log(client.wallet.address); // Address | null
console.log(client.wallet.connected); // boolean
```

### Subscribing to Changes

```ts
// Subscribe to status changes
const unsubscribe = client.wallet.subscribe(status => {
    console.log('Status:', status);
});

// Works with React's useSyncExternalStore
function useWallet() {
    return useSyncExternalStore(client.wallet.subscribe, () => client.wallet.state);
}
```

### Specific Wallet Connectors

```ts
import { walletPlugin, phantom, solflare, backpack } from '@kit-helpers/wallet';

const client = createEmptyClient().use(
    walletPlugin({
        connectors: [...phantom(), ...solflare(), ...backpack()],
    }),
);
```

## API

### `walletPlugin(options)`

| Option       | Type                | Description                |
| ------------ | ------------------- | -------------------------- |
| `connectors` | `WalletConnector[]` | Array of wallet connectors |

### `client.wallet`

| Property/Method      | Type                     | Description                   |
| -------------------- | ------------------------ | ----------------------------- |
| `state`              | `WalletStatus`           | Current connection state      |
| `address`            | `Address \| null`        | Connected address or null     |
| `connected`          | `boolean`                | Whether a wallet is connected |
| `connectors`         | `WalletConnector[]`      | Available connectors          |
| `connect(id, opts?)` | `Promise<WalletSession>` | Connect to a wallet           |
| `disconnect()`       | `Promise<void>`          | Disconnect current wallet     |
| `subscribe(cb)`      | `() => void`             | Subscribe to status changes   |

### Status Types

```ts
type WalletStatus =
    | { status: 'disconnected' }
    | { status: 'connecting'; connectorId: string }
    | { status: 'connected'; session: WalletSession; connectorId: string }
    | { status: 'error'; error: unknown; connectorId: string };
```

### Connector Factories

| Function                  | Description                          |
| ------------------------- | ------------------------------------ |
| `autoDiscover()`          | Discover all Wallet Standard wallets |
| `phantom()`               | Phantom wallet connector             |
| `solflare()`              | Solflare wallet connector            |
| `backpack()`              | Backpack wallet connector            |
| `filterByNames(...names)` | Create filter for autoDiscover       |

## License

MIT

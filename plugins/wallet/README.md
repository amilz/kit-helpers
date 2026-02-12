# @kit-helpers/wallet

Framework-agnostic wallet plugin for `@solana/kit` with Wallet Standard support.

## Features

- Zero framework dependencies (vanilla JS)
- Built on [Wallet Standard](https://github.com/wallet-standard/wallet-standard) and `@wallet-standard/ui`
- State machine for connection status
- Subscribe pattern compatible with `useSyncExternalStore`
- Auto-discovers installed wallets
- Supports read-only (view-only) wallets

## Usage

### Basic Setup

```ts
import { createEmptyClient } from '@solana/kit';
import { walletPlugin, autoDiscover } from '@kit-helpers/wallet';

const client = createEmptyClient().use(walletPlugin({ wallets: autoDiscover() }));
```

### Connecting

```ts
// List available wallets
console.log(client.wallet.wallets);

// Connect to a wallet (case-insensitive)
await client.wallet.connect('phantom');

// Access connected state
console.log(client.wallet.address); // Address | null
console.log(client.wallet.connected); // boolean
console.log(client.wallet.signer); // TransactionModifyingSigner | null
```

### Filtering Wallets

```ts
import { autoDiscover, filterByNames } from '@kit-helpers/wallet';

// Only include specific wallets
const wallets = autoDiscover({
    filter: filterByNames('Phantom', 'Solflare'),
});

// Or filter after discovery
const wallets = autoDiscover().filter(w => w.name.includes('Phantom'));
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

### Signing

```ts
import { createSignerFromAccount, createSignMessageFromAccount, canSignTransactions } from '@kit-helpers/wallet';

// Check capabilities
if (canSignTransactions(wallet)) {
    // Create a signer from the connected account
    const signer = createSignerFromAccount(session.account);
}

// Sign a message
const signMessage = createSignMessageFromAccount(session.account);
const sig = await signMessage(new TextEncoder().encode('Hello'));
```

## API

### `walletPlugin(options)`

| Option        | Type          | Description                        |
| ------------- | ------------- | ---------------------------------- |
| `wallets`     | `UiWallet[]`  | Array of UiWallet instances        |
| `autoConnect` | `boolean`     | Auto-reconnect on init (optional)  |
| `storage`     | `WalletStorage` | Persistence adapter (optional)   |

### `client.wallet`

| Property/Method        | Type                             | Description                            |
| ---------------------- | -------------------------------- | -------------------------------------- |
| `state`                | `WalletStatus`                   | Current connection state               |
| `address`              | `Address \| null`                | Connected address or null              |
| `connected`            | `boolean`                        | Whether a wallet is connected          |
| `signer`               | `TransactionModifyingSigner \| null` | Cached signer or null             |
| `wallets`              | `readonly UiWallet[]`            | Available wallets                      |
| `connect(name, opts?)` | `Promise<WalletSession>`         | Connect to a wallet (case-insensitive) |
| `disconnect()`         | `Promise<void>`                  | Disconnect current wallet              |
| `subscribe(cb)`        | `() => void`                     | Subscribe to status changes            |

### Status Types

```ts
type WalletStatus =
    | { status: 'disconnected' }
    | { status: 'connecting'; walletName: string }
    | { status: 'connected'; session: WalletSession; walletName: string }
    | { status: 'error'; error: unknown; walletName: string };
```

### Utility Functions

| Function                      | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `autoDiscover(opts?)`         | Discover all connectable wallets            |
| `filterByNames(...names)`     | Create filter for autoDiscover              |
| `onWalletRegistered(cb)`      | Subscribe to newly registered wallets       |
| `isConnectable(wallet)`       | Check if wallet supports connecting         |
| `canSignTransactions(wallet)` | Check if wallet supports signing txns       |
| `canSignMessages(wallet)`     | Check if wallet supports signing messages   |
| `createSignerFromAccount(account)`       | Create a TransactionModifyingSigner |
| `createSignMessageFromAccount(account)`  | Create a signMessage function       |
| `connectWallet(wallet, opts?)`           | Low-level connect                   |
| `disconnectWallet(wallet)`               | Low-level disconnect                |
| `subscribeToWalletEvents(wallet, cb)`    | Subscribe to wallet account changes |

## License

MIT

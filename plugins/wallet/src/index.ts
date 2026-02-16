// Main plugin
export { walletPlugin } from './wallet-plugin';

// Discovery
export { autoDiscover, filterByNames, onWalletRegistered } from './discovery';
export type { AutoDiscoverOptions } from './discovery';

// Storage
export { createLocalStorage, createNoopStorage, detectStorage } from './storage';
export type { WalletStorage } from './storage';

// Wallet-standard utilities
export {
    canSignMessages,
    canSignTransactions,
    connectWallet,
    createSignerFromAccount,
    createSignMessageFromAccount,
    disconnectWallet,
    isConnectable,
    subscribeToWalletEvents,
} from './wallet-standard';

// Signer resolution
export { resolveSigner } from './resolve-signer';
export type { SignerSource } from './resolve-signer';

// Types
export type {
    WalletApi,
    WalletPluginOptions,
    WalletSession,
    WalletStatus,
    WalletStatusConnected,
    WalletStatusConnecting,
    WalletStatusDisconnected,
    WalletStatusError,
    WalletSubscribeCallback,
} from './types';

// Re-export upstream types for convenience
export type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';

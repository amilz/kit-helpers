// Main plugin
export { walletPlugin } from './wallet-plugin';

// Connector factories
export { autoDiscover, backpack, filterByNames, onWalletRegistered, phantom, solflare } from './connectors';
export type { AutoDiscoverOptions } from './connectors';

// Storage
export { createLocalStorage, createNoopStorage, detectStorage } from './storage';
export type { WalletStorage } from './storage';

// Wallet-standard utilities
export { createWalletStandardConnector, isWalletStandardCompatible } from './wallet-standard';
export type { WalletStandardConnectorOptions } from './wallet-standard';

// Signer resolution
export { resolveSigner } from './resolve-signer';
export type { SignerSource } from './resolve-signer';

// Types
export type {
    WalletAccount,
    WalletApi,
    WalletConnector,
    WalletConnectorMetadata,
    WalletPluginOptions,
    WalletSession,
    WalletStatus,
    WalletStatusConnected,
    WalletStatusConnecting,
    WalletStatusDisconnected,
    WalletStatusError,
    WalletSubscribeCallback,
} from './types';

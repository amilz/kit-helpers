// Main plugin
export { walletPlugin } from './wallet-plugin';

// Connector factories
export { autoDiscover, backpack, filterByNames, onWalletRegistered, phantom, solflare } from './connectors';
export type { AutoDiscoverOptions } from './connectors';

// Wallet-standard utilities
export { createWalletStandardConnector, isWalletStandardCompatible } from './wallet-standard';
export type { WalletStandardConnectorOptions } from './wallet-standard';

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

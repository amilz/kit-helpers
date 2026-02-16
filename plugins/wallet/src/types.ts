import type { Address, TransactionModifyingSigner } from '@solana/kit';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';

import type { WalletStorage } from './storage';

/** An active wallet session. */
export type WalletSession = {
    /** The connected account. */
    account: UiWalletAccount;
    /** Disconnect from the wallet. */
    disconnect: () => Promise<void>;
    /** The wallet this session belongs to. */
    wallet: UiWallet;
};

/** Wallet is connected with an active session. */
export type WalletStatusConnected = {
    session: WalletSession;
    status: 'connected';
    walletName: string;
};

/** Wallet is in the process of connecting. */
export type WalletStatusConnecting = {
    status: 'connecting';
    walletName: string;
};

/** Wallet is disconnected. */
export type WalletStatusDisconnected = {
    status: 'disconnected';
};

/** Wallet connection failed with an error. */
export type WalletStatusError = {
    error: unknown;
    status: 'error';
    walletName: string;
};

/** Discriminated union of all wallet states. */
export type WalletStatus =
    | WalletStatusConnected
    | WalletStatusConnecting
    | WalletStatusDisconnected
    | WalletStatusError;

/** Options for the wallet plugin. */
export type WalletPluginOptions = {
    /** Attempt to reconnect to the last wallet on init. Default: false. */
    autoConnect?: boolean;
    /** Persistence adapter. Default: auto-detected (localStorage in browser, noop in SSR). */
    storage?: WalletStorage;
    /** Wallet instances to use. Use autoDiscover() to get all available wallets. */
    wallets: UiWallet[];
};

/** Subscription callback for wallet state changes. */
export type WalletSubscribeCallback = (status: WalletStatus) => void;

/** The wallet API added to the client by the wallet plugin. */
export type WalletApi = {
    /** Current address (null if disconnected). */
    readonly address: Address | null;
    /**
     * Connect to a wallet by name.
     * @param walletName - The name of the wallet to connect (case-insensitive).
     * @param options.autoConnect - Attempt silent connection without user interaction.
     */
    connect: (walletName: string, options?: { autoConnect?: boolean }) => Promise<WalletSession>;
    /** Whether a wallet is connected. */
    readonly connected: boolean;
    /** Disconnect from the current wallet. */
    disconnect: () => Promise<void>;
    /** Cached transaction signer from the connected wallet (null if disconnected or wallet can't sign). */
    readonly signer: TransactionModifyingSigner | null;
    /** Current wallet state (state machine). */
    readonly state: WalletStatus;
    /**
     * Subscribe to wallet status changes.
     * @returns Unsubscribe function.
     */
    subscribe: (callback: WalletSubscribeCallback) => () => void;
    /** Available wallets. */
    readonly wallets: readonly UiWallet[];
};

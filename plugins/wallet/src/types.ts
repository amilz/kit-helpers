import type { Address, SignatureBytes, TransactionSigner } from '@solana/kit';

import type { WalletStorage } from './storage';

/** Metadata describing a wallet connector. */
export type WalletConnectorMetadata = {
    /** Whether the wallet supports silent/auto-connect without user interaction. */
    canAutoConnect: boolean;
    /** Data URI of the wallet icon. */
    icon: string;
    /** Unique identifier for this connector. */
    id: string;
    /** The type of connector (e.g., 'wallet-standard', 'injected'). */
    kind: string;
    /** Human-readable name of the wallet. */
    name: string;
    /** Whether the wallet is currently available/installed. */
    ready: boolean;
};

/** A wallet account with address and public key. */
export type WalletAccount = {
    /** The account's address. */
    address: Address;
    /** Optional human-readable label for the account. */
    label?: string;
    /** The account's public key as bytes. */
    publicKey: Uint8Array;
};

/** An active wallet session with signing capabilities. */
export type WalletSession = {
    /** The connected account. */
    account: WalletAccount;
    /** Metadata about the connected wallet. */
    connector: WalletConnectorMetadata;
    /** Disconnect from the wallet. */
    disconnect: () => Promise<void>;
    /** Subscribe to account changes. Returns unsubscribe function. */
    onAccountsChanged?: (listener: (accounts: WalletAccount[]) => void) => () => void;
    /** Sign an arbitrary message. */
    signMessage: (message: Uint8Array) => Promise<SignatureBytes>;
    /** A transaction signer compatible with @solana/kit. */
    signer: TransactionSigner;
};

/** A wallet connector that can establish sessions. */
export type WalletConnector = WalletConnectorMetadata & {
    /**
     * Connect to the wallet and establish a session.
     * @param options.autoConnect - Attempt silent connection without user interaction.
     */
    connect: (options?: { autoConnect?: boolean }) => Promise<WalletSession>;
    /** Disconnect from the wallet. */
    disconnect: () => Promise<void>;
    /** Check if the wallet is supported in the current environment. */
    isSupported: () => boolean;
};

/** Wallet is connected with an active session. */
export type WalletStatusConnected = {
    connectorId: string;
    session: WalletSession;
    status: 'connected';
};

/** Wallet is in the process of connecting. */
export type WalletStatusConnecting = {
    connectorId: string;
    status: 'connecting';
};

/** Wallet is disconnected. */
export type WalletStatusDisconnected = {
    status: 'disconnected';
};

/** Wallet connection failed with an error. */
export type WalletStatusError = {
    connectorId: string;
    error: unknown;
    status: 'error';
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
    /** Wallet connectors to use. Use autoDiscover() or specific connector factories. */
    connectors: WalletConnector[];
    /** Persistence adapter. Default: auto-detected (localStorage in browser, noop in SSR). */
    storage?: WalletStorage;
};

/** Subscription callback for wallet state changes. */
export type WalletSubscribeCallback = (status: WalletStatus) => void;

/** The wallet API added to the client by the wallet plugin. */
export type WalletApi = {
    /** Current address (null if disconnected). */
    readonly address: Address | null;
    /**
     * Connect to a wallet by connector ID.
     * @param connectorId - The ID of the connector to use.
     * @param options.autoConnect - Attempt silent connection without user interaction.
     */
    connect: (connectorId: string, options?: { autoConnect?: boolean }) => Promise<WalletSession>;
    /** Whether a wallet is connected. */
    readonly connected: boolean;
    /** Available wallet connectors. */
    readonly connectors: readonly WalletConnector[];
    /** Disconnect from the current wallet. */
    disconnect: () => Promise<void>;
    /** Current wallet state (state machine). */
    readonly state: WalletStatus;
    /**
     * Subscribe to wallet status changes.
     * @returns Unsubscribe function.
     */
    subscribe: (callback: WalletSubscribeCallback) => () => void;
};

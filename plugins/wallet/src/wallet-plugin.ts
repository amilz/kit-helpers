import type { Address } from '@solana/kit';

import { detectStorage } from './storage';
import type {
    WalletApi,
    WalletConnector,
    WalletPluginOptions,
    WalletSession,
    WalletStatus,
    WalletSubscribeCallback,
} from './types';

/**
 * A plugin that adds wallet connection management to the client.
 *
 * Provides a framework-agnostic wallet API with:
 * - State machine for connection status (disconnected → connecting → connected | error)
 * - Connector abstraction over wallet-standard wallets
 * - Subscribe pattern for reactive updates (works with useSyncExternalStore)
 *
 * @param options - Plugin configuration.
 * @param options.connectors - Wallet connectors to use. Use autoDiscover() or specific factories.
 *
 * @example
 * Basic setup with auto-discovered wallets.
 * ```ts
 * import { createEmptyClient } from '@solana/kit';
 * import { walletPlugin, autoDiscover } from '@kit-helpers/wallet';
 *
 * const client = createEmptyClient()
 *   .use(walletPlugin({ connectors: autoDiscover() }));
 *
 * // Connect to a wallet
 * await client.wallet.connect('phantom');
 * console.log('Address:', client.wallet.address);
 *
 * // Subscribe to status changes
 * const unsubscribe = client.wallet.subscribe((status) => {
 *   console.log('Wallet status:', status);
 * });
 * ```
 *
 * @example
 * With specific wallet connectors.
 * ```ts
 * import { walletPlugin, phantom, solflare } from '@kit-helpers/wallet';
 *
 * const client = createEmptyClient()
 *   .use(walletPlugin({
 *     connectors: [...phantom(), ...solflare()],
 *   }));
 * ```
 *
 * @example
 * Using with React (useSyncExternalStore pattern).
 * ```ts
 * function useWallet() {
 *   return useSyncExternalStore(
 *     client.wallet.subscribe,
 *     () => client.wallet.state,
 *     () => client.wallet.state,
 *   );
 * }
 * ```
 */
export function walletPlugin(options: WalletPluginOptions) {
    const { connectors } = options;
    const storage = options.storage ?? detectStorage();
    const STORAGE_KEY = 'lastConnector';

    return <T>(client: T): T & { wallet: WalletApi } => {
        // Internal state
        let state: WalletStatus = { status: 'disconnected' };
        let accountChangeUnsubscribe: (() => void) | null = null;
        const listeners = new Set<WalletSubscribeCallback>();

        // Notify all subscribers of state changes
        const notify = () => {
            for (const listener of listeners) {
                listener(state);
            }
        };

        const wallet: WalletApi = {
            get address(): Address | null {
                if (state.status === 'connected') {
                    return state.session.account.address;
                }
                return null;
            },

            // Connect to a wallet
            async connect(connectorId: string, connectOptions?): Promise<WalletSession> {
                const connector = connectors.find(c => c.id === connectorId);
                if (!connector) {
                    const availableIds = connectors.map(c => c.id).join(', ');
                    throw new Error(
                        `Unknown wallet connector: "${connectorId}". Available connectors: ${availableIds || 'none'}`,
                    );
                }

                // Update state to connecting
                state = { connectorId, status: 'connecting' };
                notify();

                try {
                    const session = await connector.connect(connectOptions);

                    // Update state to connected
                    state = { connectorId, session, status: 'connected' };
                    notify();

                    storage.set(STORAGE_KEY, connectorId);

                    // Subscribe to account changes if supported
                    if (session.onAccountsChanged) {
                        accountChangeUnsubscribe = session.onAccountsChanged(accounts => {
                            if (accounts.length === 0) {
                                void wallet.disconnect();
                            } else if (state.status === 'connected') {
                                // Update state with the new session (already updated by connector)
                                state = { ...state, session: { ...state.session, account: accounts[0] } };
                                notify();
                            }
                        });
                    }

                    return session;
                } catch (error) {
                    // Update state to error
                    state = { connectorId, error, status: 'error' };
                    notify();

                    throw error;
                }
            },

            get connected(): boolean {
                return state.status === 'connected';
            },

            get connectors(): readonly WalletConnector[] {
                return connectors;
            },

            // Disconnect from the current wallet
            async disconnect(): Promise<void> {
                if (accountChangeUnsubscribe) {
                    accountChangeUnsubscribe();
                    accountChangeUnsubscribe = null;
                }

                if (state.status === 'connected') {
                    try {
                        await state.session.disconnect();
                    } catch {
                        // Ignore disconnect errors, just update state
                    }
                }

                state = { status: 'disconnected' };
                storage.remove(STORAGE_KEY);
                notify();
            },

            // Getters for current state
            get state() {
                return state;
            },

            // Subscribe to status changes
            subscribe(callback: WalletSubscribeCallback): () => void {
                listeners.add(callback);

                // Return unsubscribe function
                return () => {
                    listeners.delete(callback);
                };
            },
        };

        if (options.autoConnect) {
            const lastConnectorId = storage.get(STORAGE_KEY);
            if (lastConnectorId) {
                const connector = connectors.find(c => c.id === lastConnectorId);
                if (connector) {
                    void wallet.connect(lastConnectorId, { autoConnect: true }).catch(() => {
                        storage.remove(STORAGE_KEY);
                    });
                }
            }
        }

        return {
            ...client,
            wallet,
        };
    };
}

import type { Address, TransactionModifyingSigner } from '@solana/kit';
import { address as toAddress } from '@solana/kit';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';

import { detectStorage } from './storage';
import type {
    WalletApi,
    WalletPluginOptions,
    WalletSession,
    WalletStatus,
    WalletSubscribeCallback,
} from './types';
import {
    canSignTransactions,
    connectWallet,
    createSignerFromAccount,
    disconnectWallet,
    subscribeToWalletEvents,
} from './wallet-standard';

/**
 * A plugin that adds wallet connection management to the client.
 *
 * Provides a framework-agnostic wallet API with:
 * - State machine for connection status (disconnected → connecting → connected | error)
 * - UiWallet-based abstraction over wallet-standard wallets
 * - Subscribe pattern for reactive updates (works with useSyncExternalStore)
 *
 * @param options - Plugin configuration.
 * @param options.wallets - UiWallet instances. Use autoDiscover() to get all available wallets.
 *
 * @example
 * Basic setup with auto-discovered wallets.
 * ```ts
 * import { createEmptyClient } from '@solana/kit';
 * import { walletPlugin, autoDiscover } from '@kit-helpers/wallet';
 *
 * const client = createEmptyClient()
 *   .use(walletPlugin({ wallets: autoDiscover() }));
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
    const { wallets } = options;
    const storage = options.storage ?? detectStorage();
    const STORAGE_KEY = 'lastConnector'; // keep key for back-compat

    return <T>(client: T): T & { wallet: WalletApi } => {
        // Internal state
        let state: WalletStatus = { status: 'disconnected' };
        let eventsUnsubscribe: (() => void) | null = null;
        let cachedSigner: TransactionModifyingSigner | null = null;
        const listeners = new Set<WalletSubscribeCallback>();

        const notify = () => {
            for (const listener of listeners) {
                listener(state);
            }
        };

        /** Find a wallet by name (case-insensitive). */
        function findWallet(walletName: string): UiWallet | undefined {
            const lower = walletName.toLowerCase();
            return wallets.find(w => w.name.toLowerCase() === lower);
        }

        /** Build and cache the signer from the current session. */
        function updateSigner(account: UiWalletAccount | null, wallet: UiWallet | null): void {
            if (account && wallet && canSignTransactions(wallet)) {
                cachedSigner = createSignerFromAccount(account);
            } else {
                cachedSigner = null;
            }
        }

        const walletApi: WalletApi = {
            get address(): Address | null {
                if (state.status === 'connected') {
                    return toAddress(state.session.account.address);
                }
                return null;
            },

            async connect(walletName: string, connectOptions?): Promise<WalletSession> {
                const target = findWallet(walletName);
                if (!target) {
                    const availableNames = wallets.map(w => w.name).join(', ');
                    throw new Error(
                        `Unknown wallet: "${walletName}". Available wallets: ${availableNames || 'none'}`,
                    );
                }

                state = { walletName: target.name, status: 'connecting' };
                notify();

                try {
                    const accounts = await connectWallet(target, {
                        silent: connectOptions?.autoConnect,
                    });

                    const primaryAccount = accounts[0];
                    updateSigner(primaryAccount, target);

                    // Subscribe to account changes
                    eventsUnsubscribe = subscribeToWalletEvents(target, (newAccounts) => {
                        if (newAccounts.length === 0) {
                            void walletApi.disconnect();
                        } else if (state.status === 'connected') {
                            const newPrimary = newAccounts[0];
                            updateSigner(newPrimary, target);
                            state = {
                                ...state,
                                session: { ...state.session, account: newPrimary },
                            };
                            notify();
                        }
                    }) ?? null;

                    const session: WalletSession = {
                        account: primaryAccount,
                        disconnect: async () => {
                            await walletApi.disconnect();
                        },
                        wallet: target,
                    };

                    state = { walletName: target.name, session, status: 'connected' };
                    notify();

                    storage.set(STORAGE_KEY, target.name);

                    return session;
                } catch (error) {
                    state = { walletName: target.name, error, status: 'error' };
                    notify();
                    throw error;
                }
            },

            get connected(): boolean {
                return state.status === 'connected';
            },

            async disconnect(): Promise<void> {
                if (eventsUnsubscribe) {
                    eventsUnsubscribe();
                    eventsUnsubscribe = null;
                }

                cachedSigner = null;

                if (state.status === 'connected') {
                    try {
                        await disconnectWallet(state.session.wallet);
                    } catch {
                        // Ignore disconnect errors, just update state
                    }
                }

                state = { status: 'disconnected' };
                storage.remove(STORAGE_KEY);
                notify();
            },

            get signer(): TransactionModifyingSigner | null {
                return cachedSigner;
            },

            get state() {
                return state;
            },

            subscribe(callback: WalletSubscribeCallback): () => void {
                listeners.add(callback);
                return () => {
                    listeners.delete(callback);
                };
            },

            get wallets(): readonly UiWallet[] {
                return wallets;
            },
        };

        if (options.autoConnect) {
            const lastWalletName = storage.get(STORAGE_KEY);
            if (lastWalletName) {
                const target = findWallet(lastWalletName);
                if (target) {
                    void walletApi.connect(target.name, { autoConnect: true }).catch(() => {
                        storage.remove(STORAGE_KEY);
                    });
                }
            }
        }

        return {
            ...client,
            wallet: walletApi,
        };
    };
}

import type { Address } from '@solana/kit';

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
 *     () => client.wallet.status,
 *     () => client.wallet.status,
 *   );
 * }
 * ```
 */
export function walletPlugin(options: WalletPluginOptions) {
    const { connectors } = options;

    return <T>(client: T): T & { wallet: WalletApi } => {
        // Internal state
        let status: WalletStatus = { status: 'disconnected' };
        const listeners = new Set<WalletSubscribeCallback>();

        // Notify all subscribers of state changes
        const notify = () => {
            for (const listener of listeners) {
                listener(status);
            }
        };

        const wallet: WalletApi = {
            // Getters for current state
            get status() {
                return status;
            },

            get address(): Address | null {
                if (status.status === 'connected') {
                    return status.session.account.address;
                }
                return null;
            },

            get connected(): boolean {
                return status.status === 'connected';
            },

            get connectors(): readonly WalletConnector[] {
                return connectors;
            },

            // Connect to a wallet
            async connect(connectorId: string, connectOptions?): Promise<WalletSession> {
                const connector = connectors.find((c) => c.id === connectorId);
                if (!connector) {
                    const availableIds = connectors.map((c) => c.id).join(', ');
                    throw new Error(
                        `Unknown wallet connector: "${connectorId}". Available connectors: ${availableIds || 'none'}`,
                    );
                }

                // Update status to connecting
                status = { status: 'connecting', connectorId };
                notify();

                try {
                    const session = await connector.connect(connectOptions);

                    // Update status to connected
                    status = { status: 'connected', session, connectorId };
                    notify();

                    return session;
                } catch (error) {
                    // Update status to error
                    status = { status: 'error', error, connectorId };
                    notify();

                    throw error;
                }
            },

            // Disconnect from the current wallet
            async disconnect(): Promise<void> {
                if (status.status === 'connected') {
                    try {
                        await status.session.disconnect();
                    } catch {
                        // Ignore disconnect errors, just update state
                    }
                }

                status = { status: 'disconnected' };
                notify();
            },

            // Subscribe to status changes
            subscribe(callback: WalletSubscribeCallback): () => void {
                listeners.add(callback);

                // Immediately invoke with current status
                callback(status);

                // Return unsubscribe function
                return () => {
                    listeners.delete(callback);
                };
            },
        };

        return {
            ...client,
            wallet,
        };
    };
}

import type { SignatureBytes, TransactionSigner } from '@solana/kit';
import { address } from '@solana/kit';
import type { SolanaSignMessageFeature, SolanaSignTransactionFeature } from '@solana/wallet-standard-features';
import { SolanaSignMessage, SolanaSignTransaction } from '@solana/wallet-standard-features';
import type { Wallet, WalletAccount as StandardWalletAccount } from '@wallet-standard/base';
import { StandardConnect, StandardDisconnect, StandardEvents } from '@wallet-standard/features';

import type { WalletAccount, WalletConnector, WalletConnectorMetadata, WalletSession } from './types';

/** Features required for a wallet to be usable as a connector. */
const REQUIRED_FEATURES = [StandardConnect, SolanaSignTransaction] as const;

/** Check if a wallet has all required features. */
export function isWalletStandardCompatible(wallet: Wallet): boolean {
    return REQUIRED_FEATURES.every((feature) => feature in wallet.features);
}

/** Convert a wallet-standard account to our WalletAccount type. */
function toWalletAccount(account: StandardWalletAccount): WalletAccount {
    return {
        address: address(account.address),
        label: account.label,
        publicKey: new Uint8Array(account.publicKey),
    };
}

/** Create a TransactionSigner from a wallet-standard wallet and account. */
function createWalletStandardSigner(wallet: Wallet, account: StandardWalletAccount): TransactionSigner {
    const walletAddress = address(account.address);

    return {
        address: walletAddress,
        signTransactions: async (transactions) => {
            const signFeature = wallet.features[SolanaSignTransaction] as SolanaSignTransactionFeature | undefined;
            if (!signFeature) {
                throw new Error('Wallet does not support signing transactions');
            }

            // The wallet-standard signTransaction method takes an array of inputs
            const inputs = transactions.map((tx) => ({
                account,
                transaction: tx as unknown as Uint8Array,
            }));

            // Access the signTransaction method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signTransactionFn = (signFeature as any).signTransaction;
            if (typeof signTransactionFn !== 'function') {
                throw new Error('SignTransaction feature does not have a signTransaction method');
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results: any[] = await signTransactionFn(...inputs);

            return results.map((result) => result.signedTransaction) as typeof transactions;
        },
    };
}

/** Options for creating a wallet-standard connector. */
export type WalletStandardConnectorOptions = {
    /** Override connector metadata. */
    overrides?: Partial<WalletConnectorMetadata>;
};

/**
 * Create a WalletConnector from a wallet-standard Wallet.
 *
 * @param wallet - The wallet-standard Wallet instance.
 * @param options - Optional configuration.
 * @returns A WalletConnector that wraps the wallet-standard wallet.
 */
export function createWalletStandardConnector(wallet: Wallet, options?: WalletStandardConnectorOptions): WalletConnector {
    // Access features using the feature namespace strings
    const connectFeature = wallet.features[StandardConnect];
    const disconnectFeature = wallet.features[StandardDisconnect];
    const eventsFeature = wallet.features[StandardEvents];

    if (!connectFeature) {
        throw new Error(`Wallet "${wallet.name}" does not support the connect feature`);
    }

    const metadata: WalletConnectorMetadata = {
        canAutoConnect: true, // Most wallet-standard wallets support auto-connect
        icon: wallet.icon,
        id: options?.overrides?.id ?? wallet.name.toLowerCase().replace(/\s+/g, '-'),
        kind: 'wallet-standard',
        name: options?.overrides?.name ?? wallet.name,
        ready: true,
        ...options?.overrides,
    };

    let activeSession: WalletSession | null = null;
    let accountChangeUnsubscribe: (() => void) | null = null;
    const accountChangeListeners = new Set<(accounts: WalletAccount[]) => void>();

    const connector: WalletConnector = {
        ...metadata,

        async connect(connectOptions) {
            const { autoConnect = false } = connectOptions ?? {};

            try {
                // Access the connect method from the feature
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const connectFn = (connectFeature as any).connect;
                if (typeof connectFn !== 'function') {
                    throw new Error('Connect feature does not have a connect method');
                }

                const { accounts } = await connectFn({
                    silent: autoConnect,
                });

                if (accounts.length === 0) {
                    throw new Error('No accounts returned from wallet');
                }

                const primaryAccount = accounts[0] as StandardWalletAccount;
                const walletAccount = toWalletAccount(primaryAccount);
                const signer = createWalletStandardSigner(wallet, primaryAccount);

                // Set up account change listener
                if (eventsFeature) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const onFn = (eventsFeature as any).on;
                    if (typeof onFn === 'function') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        accountChangeUnsubscribe = onFn('change', ({ accounts: newAccounts }: any) => {
                            if (newAccounts && activeSession) {
                                const walletAccounts = (newAccounts as StandardWalletAccount[]).map(toWalletAccount);

                                if (newAccounts.length > 0) {
                                    // Update the session with the new primary account
                                    const newPrimaryAccount = newAccounts[0] as StandardWalletAccount;
                                    activeSession = {
                                        ...activeSession,
                                        account: toWalletAccount(newPrimaryAccount),
                                        signer: createWalletStandardSigner(wallet, newPrimaryAccount),
                                    };
                                }

                                // Notify all account change listeners
                                for (const listener of accountChangeListeners) {
                                    listener(walletAccounts);
                                }
                            }
                        });
                    }
                }

                const session: WalletSession = {
                    account: walletAccount,
                    connector: metadata,
                    disconnect: async () => {
                        await connector.disconnect();
                    },
                    onAccountsChanged: (listener) => {
                        accountChangeListeners.add(listener);
                        return () => {
                            accountChangeListeners.delete(listener);
                        };
                    },
                    signMessage: async (message: Uint8Array): Promise<SignatureBytes> => {
                        const signMessageFeature = wallet.features[SolanaSignMessage] as
                            | SolanaSignMessageFeature
                            | undefined;
                        if (!signMessageFeature) {
                            throw new Error('Wallet does not support signing messages');
                        }

                        // Access the signMessage method
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const signMessageFn = (signMessageFeature as any).signMessage;
                        if (typeof signMessageFn !== 'function') {
                            throw new Error('SignMessage feature does not have a signMessage method');
                        }

                        const [result] = await signMessageFn({
                            account: primaryAccount,
                            message,
                        });

                        return result.signature as SignatureBytes;
                    },
                    signer,
                };

                activeSession = session;
                return session;
            } catch (error) {
                // If silent connect fails and autoConnect was requested, the caller can retry without autoConnect
                throw error;
            }
        },

        async disconnect() {
            if (accountChangeUnsubscribe) {
                accountChangeUnsubscribe();
                accountChangeUnsubscribe = null;
            }

            accountChangeListeners.clear();
            activeSession = null;

            if (disconnectFeature) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const disconnectFn = (disconnectFeature as any).disconnect;
                if (typeof disconnectFn === 'function') {
                    await disconnectFn();
                }
            }
        },

        isSupported() {
            return isWalletStandardCompatible(wallet);
        },
    };

    return connector;
}

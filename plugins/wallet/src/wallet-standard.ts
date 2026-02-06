import type { SignatureBytes, TransactionModifyingSigner } from '@solana/kit';
import {
    address,
    assertIsTransactionWithinSizeLimit,
    getCompiledTransactionMessageDecoder,
    getTransactionCodec,
    getTransactionLifetimeConstraintFromCompiledTransactionMessage,
} from '@solana/kit';
import type { SolanaSignMessageFeature, SolanaSignTransactionFeature } from '@solana/wallet-standard-features';
import { SolanaSignMessage, SolanaSignTransaction } from '@solana/wallet-standard-features';
import type { Wallet, WalletAccount as StandardWalletAccount } from '@wallet-standard/base';
import type {
    StandardConnectFeature,
    StandardDisconnectFeature,
    StandardEventsFeature,
} from '@wallet-standard/features';
import { StandardConnect, StandardDisconnect, StandardEvents } from '@wallet-standard/features';

import type { WalletAccount, WalletConnector, WalletConnectorMetadata, WalletSession } from './types';

/** Features required for a wallet to be usable as a connector. */
const REQUIRED_FEATURES = [StandardConnect, SolanaSignTransaction] as const;

/** Check if a wallet has all required features. */
export function isWalletStandardCompatible(wallet: Wallet): boolean {
    return REQUIRED_FEATURES.every(feature => feature in wallet.features);
}

/** Convert a wallet-standard account to our WalletAccount type. */
function toWalletAccount(account: StandardWalletAccount): WalletAccount {
    return {
        address: address(account.address),
        label: account.label,
        publicKey: new Uint8Array(account.publicKey),
    };
}

/**
 * Create a TransactionModifyingSigner from a wallet-standard wallet and account.
 *
 * Uses TransactionModifyingSigner because the app cannot control whether the
 * wallet will modify the transaction before signing (e.g. adding guard
 * instructions or a priority fee budget).
 */
function createWalletStandardSigner(wallet: Wallet, account: StandardWalletAccount): TransactionModifyingSigner {
    const walletAddress = address(account.address);
    const transactionCodec = getTransactionCodec();

    const signFeature = wallet.features[SolanaSignTransaction] as
        | SolanaSignTransactionFeature[typeof SolanaSignTransaction]
        | undefined;

    const compiledMessageDecoder = getCompiledTransactionMessageDecoder();

    return {
        address: walletAddress,
        async modifyAndSignTransactions(transactions, config) {
            config?.abortSignal?.throwIfAborted();

            if (!signFeature) {
                throw new Error('Wallet does not support signing transactions');
            }

            const results = [];
            for (const tx of transactions) {
                const wireBytes = transactionCodec.encode(tx) as Uint8Array;
                const [output] = await signFeature.signTransaction({ account, transaction: wireBytes });
                const decoded = transactionCodec.decode(output.signedTransaction);

                assertIsTransactionWithinSizeLimit(decoded);

                const compiledMessage = compiledMessageDecoder.decode(decoded.messageBytes);
                const lifetimeConstraint =
                    await getTransactionLifetimeConstraintFromCompiledTransactionMessage(compiledMessage);

                results.push(Object.freeze({ ...decoded, lifetimeConstraint }));
            }

            return Object.freeze(results);
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
export function createWalletStandardConnector(
    wallet: Wallet,
    options?: WalletStandardConnectorOptions,
): WalletConnector {
    // Access features using the feature namespace strings with correct type casts
    const connectFeature = wallet.features[StandardConnect] as
        | StandardConnectFeature[typeof StandardConnect]
        | undefined;
    const disconnectFeature = wallet.features[StandardDisconnect] as
        | StandardDisconnectFeature[typeof StandardDisconnect]
        | undefined;
    const eventsFeature = wallet.features[StandardEvents] as StandardEventsFeature[typeof StandardEvents] | undefined;

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
                const { accounts } = await connectFeature.connect({
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
                    accountChangeUnsubscribe = eventsFeature.on('change', ({ accounts: newAccounts }) => {
                        if (newAccounts && activeSession) {
                            const walletAccounts = (newAccounts as StandardWalletAccount[]).map(toWalletAccount);

                            if (newAccounts.length > 0) {
                                const newPrimaryAccount = newAccounts[0] as StandardWalletAccount;
                                activeSession = {
                                    ...activeSession,
                                    account: toWalletAccount(newPrimaryAccount),
                                    signer: createWalletStandardSigner(wallet, newPrimaryAccount),
                                };
                            }

                            for (const listener of accountChangeListeners) {
                                listener(walletAccounts);
                            }
                        }
                    });
                }

                const session: WalletSession = {
                    account: walletAccount,
                    connector: metadata,
                    disconnect: async () => {
                        await connector.disconnect();
                    },
                    onAccountsChanged: listener => {
                        accountChangeListeners.add(listener);
                        return () => {
                            accountChangeListeners.delete(listener);
                        };
                    },
                    signMessage: async (message: Uint8Array): Promise<SignatureBytes> => {
                        const signMessageFeature = wallet.features[SolanaSignMessage] as
                            | SolanaSignMessageFeature[typeof SolanaSignMessage]
                            | undefined;
                        if (!signMessageFeature) {
                            throw new Error('Wallet does not support signing messages');
                        }

                        const [result] = await signMessageFeature.signMessage({
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
                await disconnectFeature.disconnect();
            }
        },

        isSupported() {
            return isWalletStandardCompatible(wallet);
        },
    };

    return connector;
}

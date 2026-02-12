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
import { StandardConnect, StandardDisconnect, StandardEvents } from '@wallet-standard/features';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { getWalletAccountFeature, getWalletFeature } from '@wallet-standard/ui';
import {
    getOrCreateUiWalletAccountForStandardWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
} from '@wallet-standard/ui-registry';

/** Check if a wallet supports connecting (has StandardConnect). */
export function isConnectable(wallet: UiWallet): boolean {
    return wallet.features.includes(StandardConnect);
}

/** Check if a wallet supports signing transactions (has SolanaSignTransaction). */
export function canSignTransactions(wallet: UiWallet): boolean {
    return wallet.features.includes(SolanaSignTransaction);
}

/** Check if a wallet supports signing messages (has SolanaSignMessage). */
export function canSignMessages(wallet: UiWallet): boolean {
    return wallet.features.includes(SolanaSignMessage);
}

/**
 * Connect to a wallet via StandardConnect.
 *
 * @returns The connected accounts.
 */
export async function connectWallet(
    wallet: UiWallet,
    options?: { silent?: boolean },
): Promise<UiWalletAccount[]> {
    const connectFeature = getWalletFeature(wallet, StandardConnect) as
        import('@wallet-standard/features').StandardConnectFeature[typeof StandardConnect];

    const { accounts } = await connectFeature.connect(options ? { silent: options.silent } : undefined);

    if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
    }

    // After connect, the wallet's accounts list should be updated.
    // Use wallet.accounts if available (preferred — keeps UiWalletAccount identity).
    if (wallet.accounts.length > 0) {
        return [...wallet.accounts];
    }

    // Fallback: wrap raw accounts via the registry.
    // This handles the case where UiWallet.accounts hasn't refreshed yet.
    const rawWallet = getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(wallet);
    return accounts.map(account =>
        getOrCreateUiWalletAccountForStandardWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(rawWallet, account),
    );
}

/** Disconnect from a wallet if it supports StandardDisconnect. */
export async function disconnectWallet(wallet: UiWallet): Promise<void> {
    if (!wallet.features.includes(StandardDisconnect)) {
        return;
    }

    const disconnectFeature = getWalletFeature(wallet, StandardDisconnect) as
        import('@wallet-standard/features').StandardDisconnectFeature[typeof StandardDisconnect];

    await disconnectFeature.disconnect();
}

/**
 * Create a TransactionModifyingSigner from a UiWalletAccount.
 *
 * Uses TransactionModifyingSigner because the app cannot control whether the
 * wallet will modify the transaction before signing (e.g. adding guard
 * instructions or a priority fee budget).
 */
export function createSignerFromAccount(account: UiWalletAccount): TransactionModifyingSigner {
    if (!account.features.includes(SolanaSignTransaction)) {
        throw new Error('Wallet account does not support signing transactions');
    }

    const walletAddress = address(account.address);
    const transactionCodec = getTransactionCodec();
    const compiledMessageDecoder = getCompiledTransactionMessageDecoder();

    const signFeature = getWalletAccountFeature(account, SolanaSignTransaction) as
        SolanaSignTransactionFeature[typeof SolanaSignTransaction];

    // Get the raw WalletAccount for the sign call — sign features expect the raw type
    const rawAccount = getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(account);

    return {
        address: walletAddress,
        async modifyAndSignTransactions(transactions, config) {
            config?.abortSignal?.throwIfAborted();

            const results = [];
            for (const tx of transactions) {
                const wireBytes = transactionCodec.encode(tx) as Uint8Array;
                const [output] = await signFeature.signTransaction({ account: rawAccount, transaction: wireBytes });
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

/**
 * Create a signMessage function from a UiWalletAccount.
 *
 * @returns A function that signs arbitrary messages.
 */
export function createSignMessageFromAccount(
    account: UiWalletAccount,
): (message: Uint8Array) => Promise<SignatureBytes> {
    if (!account.features.includes(SolanaSignMessage)) {
        throw new Error('Wallet account does not support signing messages');
    }

    const signMessageFeature = getWalletAccountFeature(account, SolanaSignMessage) as
        SolanaSignMessageFeature[typeof SolanaSignMessage];

    // Get the raw WalletAccount for the sign call
    const rawAccount = getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(account);

    return async (message: Uint8Array): Promise<SignatureBytes> => {
        const [result] = await signMessageFeature.signMessage({ account: rawAccount, message });
        return result.signature as SignatureBytes;
    };
}

/**
 * Subscribe to account changes on a wallet via StandardEvents.
 *
 * @returns Unsubscribe function, or undefined if the wallet doesn't support events.
 */
export function subscribeToWalletEvents(
    wallet: UiWallet,
    onAccountsChanged: (accounts: readonly UiWalletAccount[]) => void,
): (() => void) | undefined {
    if (!wallet.features.includes(StandardEvents)) {
        return undefined;
    }

    const eventsFeature = getWalletFeature(wallet, StandardEvents) as
        import('@wallet-standard/features').StandardEventsFeature[typeof StandardEvents];

    return eventsFeature.on('change', ({ accounts }) => {
        if (accounts) {
            // After an account change event, wallet.accounts should reflect the update
            onAccountsChanged(wallet.accounts);
        }
    });
}

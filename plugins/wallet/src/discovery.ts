import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';
import { StandardConnect } from '@wallet-standard/features';
import type { UiWallet } from '@wallet-standard/ui';
import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from '@wallet-standard/ui-registry';

/** Options for auto-discovering wallets. */
export type AutoDiscoverOptions = {
    /** Filter function to narrow which wallets to include. */
    filter?: (wallet: UiWallet) => boolean;
};

/**
 * Auto-discover all wallet-standard wallets that support connecting.
 *
 * Only requires StandardConnect — wallets without signing features
 * can still be used for read-only / view-only sessions.
 *
 * @param options - Configuration options.
 * @returns Array of UiWallet instances.
 *
 * @example
 * ```ts
 * // Discover all connectable wallets
 * const wallets = autoDiscover();
 *
 * // Filter to specific wallets
 * const wallets = autoDiscover({
 *   filter: filterByNames('Phantom', 'Solflare'),
 * });
 * ```
 */
export function autoDiscover(options?: AutoDiscoverOptions): UiWallet[] {
    const { filter } = options ?? {};

    const { get } = getWallets();
    const rawWallets = get();

    const result: UiWallet[] = [];
    for (const wallet of rawWallets) {
        // Only require StandardConnect (comment #2 — no SolanaSignTransaction requirement)
        if (!(StandardConnect in wallet.features)) {
            continue;
        }

        const uiWallet = getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(wallet);

        if (filter && !filter(uiWallet)) {
            continue;
        }

        result.push(uiWallet);
    }

    return result;
}

/**
 * Create a filter function that matches wallets by name.
 *
 * @param names - Wallet names to match (case-insensitive).
 * @returns Filter function for use with autoDiscover or standalone.
 *
 * @example
 * ```ts
 * const wallets = autoDiscover({
 *   filter: filterByNames('Phantom', 'Solflare'),
 * });
 * ```
 */
export function filterByNames(...names: string[]): (wallet: UiWallet) => boolean {
    const lowerNames = names.map(n => n.toLowerCase());
    return (wallet: UiWallet) => {
        const walletNameLower = wallet.name.toLowerCase();
        return lowerNames.some(name => walletNameLower.includes(name));
    };
}

/**
 * Subscribe to newly registered wallets.
 *
 * This is useful for updating the UI when a user installs a new wallet extension.
 *
 * @param callback - Called when a new wallet is registered.
 * @returns Unsubscribe function.
 *
 * @example
 * ```ts
 * const unsubscribe = onWalletRegistered((wallet) => {
 *   console.log('New wallet available:', wallet.name);
 * });
 * ```
 */
export function onWalletRegistered(callback: (wallet: UiWallet) => void): () => void {
    const { on } = getWallets();

    return on('register', (...wallets: Wallet[]) => {
        for (const wallet of wallets) {
            if (StandardConnect in wallet.features) {
                const uiWallet = getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(wallet);
                callback(uiWallet);
            }
        }
    });
}

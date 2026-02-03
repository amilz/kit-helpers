import type { Wallet } from '@wallet-standard/base';
import { getWallets } from '@wallet-standard/app';

import type { WalletConnector, WalletConnectorMetadata } from './types';
import { createWalletStandardConnector, isWalletStandardCompatible } from './wallet-standard';

/** Options for auto-discovering wallet connectors. */
export type AutoDiscoverOptions = {
    /** Filter function to narrow which wallets to include. */
    filter?: (wallet: Wallet) => boolean;
    /** Override connector metadata per wallet. */
    overrides?: (wallet: Wallet) => Partial<WalletConnectorMetadata> | undefined;
};

/**
 * Auto-discover all wallet-standard compatible wallets and create connectors.
 *
 * This function retrieves all registered wallets from the wallet-standard registry
 * and creates connectors for those that support the required features.
 *
 * @param options - Configuration options.
 * @returns Array of wallet connectors.
 *
 * @example
 * ```ts
 * // Discover all compatible wallets
 * const connectors = autoDiscover();
 *
 * // Filter to specific wallets
 * const connectors = autoDiscover({
 *   filter: (wallet) => wallet.name.includes('Phantom'),
 * });
 * ```
 */
export function autoDiscover(options?: AutoDiscoverOptions): WalletConnector[] {
    const { filter, overrides } = options ?? {};

    // Get all registered wallets
    const { get } = getWallets();
    const wallets = get();

    // Filter and map to connectors
    const connectors: WalletConnector[] = [];
    const seenIds = new Set<string>();

    for (const wallet of wallets) {
        // Skip wallets that don't have required features
        if (!isWalletStandardCompatible(wallet)) {
            continue;
        }

        // Apply custom filter if provided
        if (filter && !filter(wallet)) {
            continue;
        }

        // Get optional overrides
        const walletOverrides = overrides?.(wallet);

        // Create connector
        const connector = createWalletStandardConnector(wallet, {
            overrides: walletOverrides,
        });

        // Deduplicate by ID
        if (seenIds.has(connector.id)) {
            continue;
        }
        seenIds.add(connector.id);

        connectors.push(connector);
    }

    return connectors;
}

/**
 * Create a filter function that matches wallets by name.
 *
 * @param names - Wallet names to match (case-insensitive).
 * @returns Filter function for use with autoDiscover.
 *
 * @example
 * ```ts
 * const connectors = autoDiscover({
 *   filter: filterByNames('Phantom', 'Solflare'),
 * });
 * ```
 */
export function filterByNames(...names: string[]): (wallet: Wallet) => boolean {
    const lowerNames = names.map((n) => n.toLowerCase());
    return (wallet: Wallet) => {
        const walletNameLower = wallet.name.toLowerCase();
        return lowerNames.some((name) => walletNameLower.includes(name));
    };
}

/**
 * Discover Phantom wallet connectors.
 *
 * @returns Array of Phantom connectors (usually one or empty if not installed).
 */
export function phantom(): WalletConnector[] {
    return autoDiscover({
        filter: filterByNames('phantom'),
        overrides: () => ({ id: 'phantom' }),
    });
}

/**
 * Discover Solflare wallet connectors.
 *
 * @returns Array of Solflare connectors (usually one or empty if not installed).
 */
export function solflare(): WalletConnector[] {
    return autoDiscover({
        filter: filterByNames('solflare'),
        overrides: () => ({ id: 'solflare' }),
    });
}

/**
 * Discover Backpack wallet connectors.
 *
 * @returns Array of Backpack connectors (usually one or empty if not installed).
 */
export function backpack(): WalletConnector[] {
    return autoDiscover({
        filter: filterByNames('backpack'),
        overrides: () => ({ id: 'backpack' }),
    });
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
 * const unsubscribe = onWalletRegistered((connector) => {
 *   console.log('New wallet available:', connector.name);
 * });
 * ```
 */
export function onWalletRegistered(callback: (connector: WalletConnector) => void): () => void {
    const { on } = getWallets();

    return on('register', (wallet) => {
        if (isWalletStandardCompatible(wallet)) {
            const connector = createWalletStandardConnector(wallet);
            callback(connector);
        }
    });
}

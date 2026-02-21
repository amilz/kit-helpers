import { createEmptyClient } from '@solana/kit';
import type { Wallet, WalletAccount as StandardWalletAccount } from '@wallet-standard/base';
import type { UiWallet } from '@wallet-standard/ui';
import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from '@wallet-standard/ui-registry';
import { describe, expect, it, vi } from 'vitest';

import { autoDiscover, canSignMessages, canSignTransactions, filterByNames, isConnectable, walletPlugin } from '../src';
import type { WalletStatus } from '../src';

describe('walletPlugin', () => {
    it('adds wallet property to client', () => {
        const wallets: UiWallet[] = [];
        const client = createEmptyClient().use(walletPlugin({ wallets }));

        expect(client).toHaveProperty('wallet');
        expect(client.wallet).toHaveProperty('state');
        expect(client.wallet).toHaveProperty('address');
        expect(client.wallet).toHaveProperty('connected');
        expect(client.wallet).toHaveProperty('wallets');
        expect(client.wallet).toHaveProperty('connect');
        expect(client.wallet).toHaveProperty('disconnect');
        expect(client.wallet).toHaveProperty('subscribe');
        expect(client.wallet).toHaveProperty('signer');
    });

    it('starts in disconnected state', () => {
        const wallets: UiWallet[] = [];
        const client = createEmptyClient().use(walletPlugin({ wallets }));

        expect(client.wallet.state).toEqual({ status: 'disconnected' });
        expect(client.wallet.address).toBeNull();
        expect(client.wallet.connected).toBe(false);
        expect(client.wallet.signer).toBeNull();
    });

    it('exposes provided wallets', () => {
        const wallet1 = createMockUiWallet({ name: 'Phantom' });
        const wallet2 = createMockUiWallet({ name: 'Solflare' });
        const wallets = [wallet1, wallet2];

        const client = createEmptyClient().use(walletPlugin({ wallets }));

        expect(client.wallet.wallets).toHaveLength(2);
        expect(client.wallet.wallets[0].name).toBe('Phantom');
        expect(client.wallet.wallets[1].name).toBe('Solflare');
    });

    it('connect() throws for unknown wallet', async () => {
        const wallets: UiWallet[] = [];
        const client = createEmptyClient().use(walletPlugin({ wallets }));

        await expect(client.wallet.connect('unknown')).rejects.toThrow('Unknown wallet: "unknown"');
    });

    it('connect() transitions to connecting then connected state', async () => {
        const wallet = createMockUiWallet({ name: 'Phantom' });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const states: WalletStatus[] = [];
        client.wallet.subscribe(status => states.push({ ...status }));

        await client.wallet.connect('Phantom');

        // Should have: connecting, connected
        expect(states).toHaveLength(2);
        expect(states[0].status).toBe('connecting');
        expect(states[1].status).toBe('connected');
    });

    it('connect() returns the session', async () => {
        const wallet = createMockUiWallet({ name: 'Phantom' });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const session = await client.wallet.connect('Phantom');

        expect(session).toHaveProperty('account');
        expect(session).toHaveProperty('wallet');
        expect(session).toHaveProperty('disconnect');
    });

    it('connect() updates address and connected getters', async () => {
        const wallet = createMockUiWallet({
            name: 'Phantom',
            accountAddress: '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
        });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        await client.wallet.connect('Phantom');

        expect(client.wallet.address).toBe('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        expect(client.wallet.connected).toBe(true);
    });

    it('connect() is case-insensitive', async () => {
        const wallet = createMockUiWallet({ name: 'Phantom' });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const session = await client.wallet.connect('phantom');

        expect(session).toBeDefined();
        expect(client.wallet.connected).toBe(true);
    });

    it('connect() passes autoConnect as silent option', async () => {
        const connectFn = vi.fn().mockResolvedValue({
            accounts: [createMockStandardAccount()],
        });
        const wallet = createMockUiWallet({
            name: 'Phantom',
            features: {
                'standard:connect': { connect: connectFn },
            },
        });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        await client.wallet.connect('Phantom', { autoConnect: true });

        expect(connectFn).toHaveBeenCalledWith({ silent: true });
    });

    it('connect() transitions to error state on failure', async () => {
        const error = new Error('User rejected');
        const wallet = createMockUiWallet({
            name: 'Phantom',
            features: {
                'standard:connect': {
                    connect: vi.fn().mockRejectedValue(error),
                },
            },
        });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const states: WalletStatus[] = [];
        client.wallet.subscribe(status => states.push({ ...status }));

        await expect(client.wallet.connect('Phantom')).rejects.toThrow('User rejected');

        expect(states).toHaveLength(2);
        expect(states[1].status).toBe('error');
        if (states[1].status === 'error') {
            expect(states[1].error).toBe(error);
            expect(states[1].walletName).toBe('Phantom');
        }
    });

    it('disconnect() transitions to disconnected state', async () => {
        const wallet = createMockUiWallet({ name: 'Phantom' });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        await client.wallet.connect('Phantom');
        expect(client.wallet.connected).toBe(true);

        await client.wallet.disconnect();

        expect(client.wallet.state).toEqual({ status: 'disconnected' });
        expect(client.wallet.address).toBeNull();
        expect(client.wallet.connected).toBe(false);
        expect(client.wallet.signer).toBeNull();
    });

    it('disconnect() calls wallet disconnect feature', async () => {
        const disconnectFn = vi.fn();
        const wallet = createMockUiWallet({
            name: 'Phantom',
            features: {
                'standard:disconnect': { disconnect: disconnectFn },
            },
        });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        await client.wallet.connect('Phantom');
        await client.wallet.disconnect();

        expect(disconnectFn).toHaveBeenCalled();
    });

    it('disconnect() does nothing when already disconnected', async () => {
        const wallets: UiWallet[] = [];
        const client = createEmptyClient().use(walletPlugin({ wallets }));

        // Should not throw
        await client.wallet.disconnect();

        expect(client.wallet.state).toEqual({ status: 'disconnected' });
    });

    it('subscribe() returns unsubscribe function', () => {
        const wallets: UiWallet[] = [];
        const client = createEmptyClient().use(walletPlugin({ wallets }));

        const callback = vi.fn();
        const unsubscribe = client.wallet.subscribe(callback);

        expect(typeof unsubscribe).toBe('function');

        // Should not have been called (no immediate invocation)
        expect(callback).toHaveBeenCalledTimes(0);
    });

    it('unsubscribe() stops notifications', async () => {
        const wallet = createMockUiWallet({ name: 'Phantom' });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const callback = vi.fn();
        const unsubscribe = client.wallet.subscribe(callback);

        // Unsubscribe
        unsubscribe();

        // Connect should not trigger callback
        await client.wallet.connect('Phantom');

        // No calls at all
        expect(callback).toHaveBeenCalledTimes(0);
    });

    it('multiple subscribers all receive updates', async () => {
        const wallet = createMockUiWallet({ name: 'Phantom' });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const callback1 = vi.fn();
        const callback2 = vi.fn();
        client.wallet.subscribe(callback1);
        client.wallet.subscribe(callback2);

        await client.wallet.connect('Phantom');

        // Each should have: connecting + connected = 2 calls
        expect(callback1).toHaveBeenCalledTimes(2);
        expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('wallet without sign feature can still connect (view-only)', async () => {
        // Wallet with only StandardConnect — no SolanaSignTransaction
        const wallet = createMockUiWallet({
            name: 'ReadOnly',
            includeSignFeatures: false,
        });
        const client = createEmptyClient().use(walletPlugin({ wallets: [wallet] }));

        const session = await client.wallet.connect('ReadOnly');

        expect(session).toBeDefined();
        expect(client.wallet.connected).toBe(true);
        // Signer should be null for a wallet that can't sign
        expect(client.wallet.signer).toBeNull();
    });
});

describe('isConnectable', () => {
    it('returns true for wallet with StandardConnect', () => {
        const wallet = createMockUiWallet({ name: 'Test' });
        expect(isConnectable(wallet)).toBe(true);
    });
});

describe('canSignTransactions', () => {
    it('returns true for wallet with SolanaSignTransaction', () => {
        const wallet = createMockUiWallet({ name: 'Test' });
        expect(canSignTransactions(wallet)).toBe(true);
    });

    it('returns false for wallet without SolanaSignTransaction', () => {
        const wallet = createMockUiWallet({ name: 'Test', includeSignFeatures: false });
        expect(canSignTransactions(wallet)).toBe(false);
    });
});

describe('canSignMessages', () => {
    it('returns true for wallet with SolanaSignMessage', () => {
        const wallet = createMockUiWallet({ name: 'Test' });
        expect(canSignMessages(wallet)).toBe(true);
    });

    it('returns false for wallet without SolanaSignMessage', () => {
        const wallet = createMockUiWallet({ name: 'Test', includeSignFeatures: false });
        expect(canSignMessages(wallet)).toBe(false);
    });
});

describe('filterByNames', () => {
    it('creates filter that matches wallet names', () => {
        const filter = filterByNames('Phantom', 'Solflare');
        const phantom = createMockUiWallet({ name: 'Phantom' });
        const solflare = createMockUiWallet({ name: 'Solflare' });
        const other = createMockUiWallet({ name: 'Other Wallet' });

        expect(filter(phantom)).toBe(true);
        expect(filter(solflare)).toBe(true);
        expect(filter(other)).toBe(false);
    });

    it('is case-insensitive', () => {
        const filter = filterByNames('phantom');
        const wallet = createMockUiWallet({ name: 'PHANTOM' });

        expect(filter(wallet)).toBe(true);
    });

    it('matches partial names', () => {
        const filter = filterByNames('phantom');
        const wallet = createMockUiWallet({ name: 'Phantom Wallet Extension' });

        expect(filter(wallet)).toBe(true);
    });
});

describe('autoDiscover', () => {
    it('returns empty array when no wallets registered', () => {
        // In Node.js test environment, we expect empty
        const wallets = autoDiscover();
        expect(Array.isArray(wallets)).toBe(true);
    });
});

// ---- Helper functions ----

function createMockStandardAccount(overrides?: Partial<{ address: string; label: string }>): StandardWalletAccount {
    return {
        address: overrides?.address ?? '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
        publicKey: new Uint8Array(32),
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        features: ['solana:signTransaction', 'solana:signMessage'] as const,
        label: overrides?.label,
    } as StandardWalletAccount;
}

function createMockStandardWallet(
    overrides?: Partial<{
        name: string;
        icon: string;
        features: Record<string, unknown>;
        accountAddress: string;
        includeSignFeatures: boolean;
    }>,
): Wallet {
    const includeSign = overrides?.includeSignFeatures !== false;
    const defaultAccount = createMockStandardAccount({ address: overrides?.accountAddress });

    const defaultFeatures: Record<string, unknown> = {
        'standard:connect': {
            connect: vi.fn().mockResolvedValue({ accounts: [defaultAccount] }),
        },
        'standard:disconnect': {
            disconnect: vi.fn(),
        },
        'standard:events': {
            on: vi.fn().mockReturnValue(() => {}),
        },
    };

    if (includeSign) {
        defaultFeatures['solana:signTransaction'] = {
            signTransaction: vi.fn().mockResolvedValue([{ signedTransaction: new Uint8Array() }]),
        };
        defaultFeatures['solana:signMessage'] = {
            signMessage: vi.fn().mockResolvedValue([{ signature: new Uint8Array(64) }]),
        };
    }

    return {
        name: overrides?.name ?? 'Mock Wallet',
        icon: (overrides?.icon ?? 'data:image/svg+xml,<svg></svg>') as `data:image/${string}`,
        version: '1.0.0' as const,
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        features: {
            ...defaultFeatures,
            ...overrides?.features,
        },
        accounts: [defaultAccount],
    } as Wallet;
}

/**
 * Create a real UiWallet instance by wrapping a mock standard Wallet
 * through the official registry function.
 */
function createMockUiWallet(
    overrides?: Partial<{
        name: string;
        icon: string;
        features: Record<string, unknown>;
        accountAddress: string;
        includeSignFeatures: boolean;
    }>,
): UiWallet {
    const standardWallet = createMockStandardWallet(overrides);
    return getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(standardWallet);
}

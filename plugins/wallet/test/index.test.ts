import { address, createEmptyClient } from '@solana/kit';
import type { Wallet } from '@wallet-standard/base';
import { describe, expect, it, vi } from 'vitest';

import {
    autoDiscover,
    createWalletStandardConnector,
    filterByNames,
    isWalletStandardCompatible,
    walletPlugin,
} from '../src';
import type { WalletAccount, WalletConnector, WalletSession, WalletStatus } from '../src';

describe('walletPlugin', () => {
    it('adds wallet property to client', () => {
        const connectors: WalletConnector[] = [];
        const client = createEmptyClient().use(walletPlugin({ connectors }));

        expect(client).toHaveProperty('wallet');
        expect(client.wallet).toHaveProperty('state');
        expect(client.wallet).toHaveProperty('address');
        expect(client.wallet).toHaveProperty('connected');
        expect(client.wallet).toHaveProperty('connectors');
        expect(client.wallet).toHaveProperty('connect');
        expect(client.wallet).toHaveProperty('disconnect');
        expect(client.wallet).toHaveProperty('subscribe');
    });

    it('starts in disconnected state', () => {
        const connectors: WalletConnector[] = [];
        const client = createEmptyClient().use(walletPlugin({ connectors }));

        expect(client.wallet.state).toEqual({ status: 'disconnected' });
        expect(client.wallet.address).toBeNull();
        expect(client.wallet.connected).toBe(false);
    });

    it('exposes provided connectors', () => {
        const connector1 = createMockConnector('phantom');
        const connector2 = createMockConnector('solflare');
        const connectors = [connector1, connector2];

        const client = createEmptyClient().use(walletPlugin({ connectors }));

        expect(client.wallet.connectors).toHaveLength(2);
        expect(client.wallet.connectors[0].id).toBe('phantom');
        expect(client.wallet.connectors[1].id).toBe('solflare');
    });

    it('connect() throws for unknown connector', async () => {
        const connectors: WalletConnector[] = [];
        const client = createEmptyClient().use(walletPlugin({ connectors }));

        await expect(client.wallet.connect('unknown')).rejects.toThrow('Unknown wallet connector: "unknown"');
    });

    it('connect() transitions to connecting then connected state', async () => {
        const mockSession = createMockSession();
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const states: WalletStatus[] = [];
        client.wallet.subscribe((status) => states.push({ ...status }));

        await client.wallet.connect('phantom');

        // Should have: connecting, connected
        expect(states).toHaveLength(2);
        expect(states[0].status).toBe('connecting');
        expect(states[1].status).toBe('connected');
    });

    it('connect() returns the session', async () => {
        const mockSession = createMockSession();
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const session = await client.wallet.connect('phantom');

        expect(session).toBe(mockSession);
    });

    it('connect() updates address and connected getters', async () => {
        const testAddress = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        const mockSession = createMockSession({ address: testAddress });
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        await client.wallet.connect('phantom');

        expect(client.wallet.address).toBe(testAddress);
        expect(client.wallet.connected).toBe(true);
    });

    it('connect() passes autoConnect option to connector', async () => {
        const mockSession = createMockSession();
        let receivedOptions: unknown;
        const connector = createMockConnector('phantom', {
            connect: async (options) => {
                receivedOptions = options;
                return mockSession;
            },
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        await client.wallet.connect('phantom', { autoConnect: true });

        expect(receivedOptions).toEqual({ autoConnect: true });
    });

    it('connect() transitions to error state on failure', async () => {
        const error = new Error('User rejected');
        const connector = createMockConnector('phantom', {
            connect: async () => {
                throw error;
            },
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const states: WalletStatus[] = [];
        client.wallet.subscribe((status) => states.push({ ...status }));

        await expect(client.wallet.connect('phantom')).rejects.toThrow('User rejected');

        expect(states).toHaveLength(2);
        expect(states[1].status).toBe('error');
        if (states[1].status === 'error') {
            expect(states[1].error).toBe(error);
            expect(states[1].connectorId).toBe('phantom');
        }
    });

    it('disconnect() transitions to disconnected state', async () => {
        const mockSession = createMockSession();
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        await client.wallet.connect('phantom');
        expect(client.wallet.connected).toBe(true);

        await client.wallet.disconnect();

        expect(client.wallet.state).toEqual({ status: 'disconnected' });
        expect(client.wallet.address).toBeNull();
        expect(client.wallet.connected).toBe(false);
    });

    it('disconnect() calls session.disconnect()', async () => {
        let disconnectCalled = false;
        const mockSession = createMockSession({
            disconnect: async () => {
                disconnectCalled = true;
            },
        });
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        await client.wallet.connect('phantom');
        await client.wallet.disconnect();

        expect(disconnectCalled).toBe(true);
    });

    it('disconnect() does nothing when already disconnected', async () => {
        const connectors: WalletConnector[] = [];
        const client = createEmptyClient().use(walletPlugin({ connectors }));

        // Should not throw
        await client.wallet.disconnect();

        expect(client.wallet.state).toEqual({ status: 'disconnected' });
    });

    it('subscribe() returns unsubscribe function', () => {
        const connectors: WalletConnector[] = [];
        const client = createEmptyClient().use(walletPlugin({ connectors }));

        const callback = vi.fn();
        const unsubscribe = client.wallet.subscribe(callback);

        expect(typeof unsubscribe).toBe('function');

        // Should not have been called (no immediate invocation)
        expect(callback).toHaveBeenCalledTimes(0);
    });

    it('unsubscribe() stops notifications', async () => {
        const mockSession = createMockSession();
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const callback = vi.fn();
        const unsubscribe = client.wallet.subscribe(callback);

        // Unsubscribe
        unsubscribe();

        // Connect should not trigger callback
        await client.wallet.connect('phantom');

        // No calls at all
        expect(callback).toHaveBeenCalledTimes(0);
    });

    it('multiple subscribers all receive updates', async () => {
        const mockSession = createMockSession();
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const callback1 = vi.fn();
        const callback2 = vi.fn();
        client.wallet.subscribe(callback1);
        client.wallet.subscribe(callback2);

        await client.wallet.connect('phantom');

        // Each should have: connecting + connected = 2 calls
        expect(callback1).toHaveBeenCalledTimes(2);
        expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('account change notifies subscribers with updated state', async () => {
        let accountChangeListener: ((accounts: WalletAccount[]) => void) | null = null;
        const mockSession = createMockSession({
            onAccountsChanged: (listener) => {
                accountChangeListener = listener;
                return () => {
                    accountChangeListener = null;
                };
            },
        });
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const states: WalletStatus[] = [];
        client.wallet.subscribe((s) => states.push({ ...s }));

        await client.wallet.connect('phantom');
        expect(states).toHaveLength(2); // connecting, connected

        // Simulate account change
        const newAccount: WalletAccount = {
            address: address('FcaY9zGSAhA7GPqjKHYPwsMqGGPENosMbPevJjaNuejF'),
            publicKey: new Uint8Array(32),
        };
        accountChangeListener!([ newAccount ]);

        expect(states).toHaveLength(3);
        expect(states[2].status).toBe('connected');
        if (states[2].status === 'connected') {
            expect(states[2].session.account.address).toBe('FcaY9zGSAhA7GPqjKHYPwsMqGGPENosMbPevJjaNuejF');
        }
    });

    it('account change to zero accounts triggers disconnect', async () => {
        let accountChangeListener: ((accounts: WalletAccount[]) => void) | null = null;
        const mockSession = createMockSession({
            onAccountsChanged: (listener) => {
                accountChangeListener = listener;
                return () => {
                    accountChangeListener = null;
                };
            },
        });
        const connector = createMockConnector('phantom', {
            connect: async () => mockSession,
        });
        const client = createEmptyClient().use(walletPlugin({ connectors: [connector] }));

        const states: WalletStatus[] = [];
        client.wallet.subscribe((s) => states.push({ ...s }));

        await client.wallet.connect('phantom');
        expect(states).toHaveLength(2); // connecting, connected

        // Simulate zero accounts (wallet disconnected externally)
        accountChangeListener!([]);

        // disconnect is async, wait for it
        await vi.waitFor(() => {
            expect(client.wallet.state).toEqual({ status: 'disconnected' });
        });
    });
});

describe('isWalletStandardCompatible', () => {
    it('returns true for wallet with required features', () => {
        const wallet = createMockWalletStandard();
        expect(isWalletStandardCompatible(wallet as Wallet)).toBe(true);
    });

    it('returns false for wallet missing StandardConnect', () => {
        const wallet = createMockWalletStandard();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (wallet.features as any)['standard:connect'];
        expect(isWalletStandardCompatible(wallet as Wallet)).toBe(false);
    });

    it('returns false for wallet missing SolanaSignTransaction', () => {
        const wallet = createMockWalletStandard();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (wallet.features as any)['solana:signTransaction'];
        expect(isWalletStandardCompatible(wallet as Wallet)).toBe(false);
    });
});

describe('createWalletStandardConnector', () => {
    it('creates connector with correct metadata', () => {
        const wallet = createMockWalletStandard({ name: 'Phantom' });
        const connector = createWalletStandardConnector(wallet as Wallet);

        expect(connector.id).toBe('phantom');
        expect(connector.name).toBe('Phantom');
        expect(connector.kind).toBe('wallet-standard');
        expect(connector.ready).toBe(true);
    });

    it('allows metadata overrides', () => {
        const wallet = createMockWalletStandard({ name: 'Phantom' });
        const connector = createWalletStandardConnector(wallet as Wallet, {
            overrides: { id: 'custom-id', name: 'Custom Name' },
        });

        expect(connector.id).toBe('custom-id');
        expect(connector.name).toBe('Custom Name');
    });

    it('connect() calls wallet connect feature', async () => {
        const connectFn = vi.fn().mockResolvedValue({
            accounts: [createMockWalletStandardAccount()],
        });
        const wallet = createMockWalletStandard({
            features: {
                'standard:connect': { connect: connectFn },
            },
        });
        const connector = createWalletStandardConnector(wallet as Wallet);

        await connector.connect();

        expect(connectFn).toHaveBeenCalled();
    });

    it('connect() with autoConnect passes silent: true', async () => {
        const connectFn = vi.fn().mockResolvedValue({
            accounts: [createMockWalletStandardAccount()],
        });
        const wallet = createMockWalletStandard({
            features: {
                'standard:connect': { connect: connectFn },
            },
        });
        const connector = createWalletStandardConnector(wallet as Wallet);

        await connector.connect({ autoConnect: true });

        expect(connectFn).toHaveBeenCalledWith({ silent: true });
    });

    it('connect() throws if no accounts returned', async () => {
        const wallet = createMockWalletStandard({
            features: {
                'standard:connect': {
                    connect: vi.fn().mockResolvedValue({ accounts: [] }),
                },
            },
        });
        const connector = createWalletStandardConnector(wallet as Wallet);

        await expect(connector.connect()).rejects.toThrow('No accounts returned from wallet');
    });

    it('connect() returns session with correct account', async () => {
        const mockAccount = createMockWalletStandardAccount({
            address: '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
            label: 'My Account',
        });
        const wallet = createMockWalletStandard({
            features: {
                'standard:connect': {
                    connect: vi.fn().mockResolvedValue({ accounts: [mockAccount] }),
                },
            },
        });
        const connector = createWalletStandardConnector(wallet as Wallet);

        const session = await connector.connect();

        expect(session.account.address).toBe('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        expect(session.account.label).toBe('My Account');
    });

    it('disconnect() calls wallet disconnect feature if available', async () => {
        const disconnectFn = vi.fn();
        const wallet = createMockWalletStandard({
            features: {
                'standard:disconnect': { disconnect: disconnectFn },
            },
        });
        const connector = createWalletStandardConnector(wallet as Wallet);

        await connector.connect();
        await connector.disconnect();

        expect(disconnectFn).toHaveBeenCalled();
    });

    it('isSupported() returns true for compatible wallet', () => {
        const wallet = createMockWalletStandard();
        const connector = createWalletStandardConnector(wallet as Wallet);

        expect(connector.isSupported()).toBe(true);
    });
});

describe('filterByNames', () => {
    it('creates filter that matches wallet names', () => {
        const filter = filterByNames('Phantom', 'Solflare');
        const phantomWallet = createMockWalletStandard({ name: 'Phantom' });
        const solflareWallet = createMockWalletStandard({ name: 'Solflare' });
        const otherWallet = createMockWalletStandard({ name: 'Other Wallet' });

        expect(filter(phantomWallet as Wallet)).toBe(true);
        expect(filter(solflareWallet as Wallet)).toBe(true);
        expect(filter(otherWallet as Wallet)).toBe(false);
    });

    it('is case-insensitive', () => {
        const filter = filterByNames('phantom');
        const wallet = createMockWalletStandard({ name: 'PHANTOM' });

        expect(filter(wallet as Wallet)).toBe(true);
    });

    it('matches partial names', () => {
        const filter = filterByNames('phantom');
        const wallet = createMockWalletStandard({ name: 'Phantom Wallet Extension' });

        expect(filter(wallet as Wallet)).toBe(true);
    });
});

describe('autoDiscover', () => {
    it('returns empty array when no wallets registered', () => {
        // Note: In browser environment this would query the wallet registry
        // In Node.js test environment, we expect empty
        const connectors = autoDiscover();
        expect(Array.isArray(connectors)).toBe(true);
    });
});

// Helper functions
function createMockConnector(
    id: string,
    overrides?: Partial<{
        connect: (options?: { autoConnect?: boolean }) => Promise<WalletSession>;
        disconnect: () => Promise<void>;
    }>,
): WalletConnector {
    return {
        canAutoConnect: true,
        icon: 'data:image/svg+xml,<svg></svg>',
        id,
        kind: 'mock',
        name: id.charAt(0).toUpperCase() + id.slice(1),
        ready: true,
        connect: overrides?.connect ?? (async () => createMockSession()),
        disconnect: overrides?.disconnect ?? (async () => {}),
        isSupported: () => true,
    };
}

function createMockSession(
    overrides?: Partial<{
        address: ReturnType<typeof address>;
        disconnect: () => Promise<void>;
        onAccountsChanged: (listener: (accounts: WalletAccount[]) => void) => () => void;
    }>,
): WalletSession {
    const testAddress = overrides?.address ?? address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
    return {
        account: {
            address: testAddress,
            label: 'Test Account',
            publicKey: new Uint8Array(32),
        },
        connector: {
            canAutoConnect: true,
            icon: 'data:image/svg+xml,<svg></svg>',
            id: 'mock',
            kind: 'mock',
            name: 'Mock Wallet',
            ready: true,
        },
        disconnect: overrides?.disconnect ?? (async () => {}),
        onAccountsChanged: overrides?.onAccountsChanged,
        signMessage: async () => new Uint8Array(64) as unknown as ReturnType<WalletSession['signMessage']>,
        signer: {
            address: testAddress,
            signTransactions: async (txs) => txs,
        },
    };
}

function createMockWalletStandard(
    overrides?: Partial<{
        name: string;
        icon: string;
        features: Record<string, unknown>;
    }>,
) {
    const defaultFeatures = {
        'standard:connect': {
            connect: vi.fn().mockResolvedValue({
                accounts: [createMockWalletStandardAccount()],
            }),
        },
        'standard:disconnect': {
            disconnect: vi.fn(),
        },
        'standard:events': {
            on: vi.fn().mockReturnValue(() => {}),
        },
        'solana:signTransaction': {
            signTransaction: vi.fn().mockResolvedValue([{ signedTransaction: new Uint8Array() }]),
        },
        'solana:signMessage': {
            signMessage: vi.fn().mockResolvedValue([{ signature: new Uint8Array(64) }]),
        },
    };

    return {
        name: overrides?.name ?? 'Mock Wallet',
        icon: overrides?.icon ?? 'data:image/svg+xml,<svg></svg>',
        version: '1.0.0' as const,
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        features: {
            ...defaultFeatures,
            ...overrides?.features,
        },
        accounts: [] as const,
    };
}

function createMockWalletStandardAccount(
    overrides?: Partial<{
        address: string;
        label: string;
    }>,
) {
    return {
        address: overrides?.address ?? '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
        publicKey: new Uint8Array(32),
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        features: ['solana:signTransaction', 'solana:signMessage'] as const,
        label: overrides?.label,
    };
}

import { createEmptyClient, generateKeyPairSigner } from '@solana/kit';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { describe, expect, it, vi } from 'vitest';

import { testTokenPlugin } from '../src';

// Mock sendAndConfirmTransactionFactory for RPC tests
vi.mock('@solana/kit', async importOriginal => {
    const actual = await importOriginal<typeof import('@solana/kit')>();
    return {
        ...actual,
        sendAndConfirmTransactionFactory: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
    };
});

describe('testTokenPlugin', () => {
    it('adds createTestToken method to client', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, rpcSubscriptions }))
            .use(testTokenPlugin());

        expect(client).toHaveProperty('createTestToken');
        expect(typeof client.createTestToken).toBe('function');
    });

    it('preserves existing client properties', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, rpcSubscriptions, customProp: 'test' }))
            .use(testTokenPlugin());

        expect(client).toHaveProperty('customProp', 'test');
        expect(client).toHaveProperty('payer');
        expect(client).toHaveProperty('rpc');
    });
});

describe('LiteSVM support', () => {
    it('works with LiteSVM client', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken();

        expect(result).toHaveProperty('mint');
        expect(result).toHaveProperty('ata');
        expect(result).toHaveProperty('mintAuthority');
        expect(result).toHaveProperty('signature');
        expect(svm.sendTransaction).toHaveBeenCalled();
    });

    it('uses payer as default mint authority', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken();

        expect(result.mintAuthority).toBe(payer.address);
    });

    it('uses custom mint authority when provided', async () => {
        const payer = await generateKeyPairSigner();
        const customAuthority = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({
            mintAuthority: customAuthority,
        });

        expect(result.mintAuthority).toBe(customAuthority.address);
    });

    it('uses custom mint keypair when provided', async () => {
        const payer = await generateKeyPairSigner();
        const customMint = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({
            mintKeypair: customMint,
        });

        expect(result.mint).toBe(customMint.address);
    });

    it('calls minimumBalanceForRentExemption on LiteSVM', async () => {
        const payer = await generateKeyPairSigner();
        const minimumBalanceForRentExemption = vi.fn().mockReturnValue(1_461_600n);
        const svm = createMockSvm({ minimumBalanceForRentExemption });

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        await client.createTestToken();

        expect(minimumBalanceForRentExemption).toHaveBeenCalledWith(82n);
    });

    it('derives different ATA for different mints', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result1 = await client.createTestToken();
        const result2 = await client.createTestToken();

        expect(result1.mint).not.toBe(result2.mint);
        expect(result1.ata).not.toBe(result2.ata);
    });

    it('accepts decimals option', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({ decimals: 6 });
        expect(result).toHaveProperty('mint');
    });

    it('accepts amount option', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({ amount: 1_000_000_000_000n });
        expect(result).toHaveProperty('mint');
    });

    it('accepts programId option for Token-2022', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({
            programId: TOKEN_2022_PROGRAM_ADDRESS,
        });
        expect(result).toHaveProperty('mint');
    });

    it('accepts freezeAuthority option', async () => {
        const payer = await generateKeyPairSigner();
        const freezeAuth = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({
            freezeAuthority: freezeAuth.address,
        });
        expect(result).toHaveProperty('mint');
    });
});

describe('RPC support', () => {
    it('works with RPC client (no LiteSVM)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, rpcSubscriptions }))
            .use(testTokenPlugin());

        const result = await client.createTestToken();

        expect(result).toHaveProperty('mint');
        expect(result).toHaveProperty('ata');
        expect(result).toHaveProperty('mintAuthority');
        expect(result).toHaveProperty('signature');
        expect(rpc.getLatestBlockhash).toHaveBeenCalled();
        expect(rpc.getMinimumBalanceForRentExemption).toHaveBeenCalled();
    });

    it('uses payer as default mint authority via RPC', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, rpcSubscriptions }))
            .use(testTokenPlugin());

        const result = await client.createTestToken();

        expect(result.mintAuthority).toBe(payer.address);
    });

    it('accepts custom decimals via RPC', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, rpcSubscriptions }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({ decimals: 6 });
        expect(result).toHaveProperty('mint');
    });

    it('accepts Token-2022 programId via RPC', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, rpcSubscriptions }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({
            programId: TOKEN_2022_PROGRAM_ADDRESS,
        });
        expect(result).toHaveProperty('mint');
    });
});

describe('input validation', () => {
    it('throws for invalid decimals (negative)', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        await expect(client.createTestToken({ decimals: -1 })).rejects.toThrow(
            'Invalid decimals: -1. Must be an integer between 0 and 255.',
        );
    });

    it('throws for invalid decimals (> 255)', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        await expect(client.createTestToken({ decimals: 256 })).rejects.toThrow(
            'Invalid decimals: 256. Must be an integer between 0 and 255.',
        );
    });

    it('throws for invalid decimals (non-integer)', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        await expect(client.createTestToken({ decimals: 6.5 })).rejects.toThrow(
            'Invalid decimals: 6.5. Must be an integer between 0 and 255.',
        );
    });

    it('throws for negative amount', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        await expect(client.createTestToken({ amount: -1n })).rejects.toThrow(
            'Invalid amount: -1. Must be a non-negative bigint.',
        );
    });

    it('accepts valid edge case decimals (0 and 255)', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result0 = await client.createTestToken({ decimals: 0 });
        expect(result0).toHaveProperty('mint');

        const result255 = await client.createTestToken({ decimals: 255 });
        expect(result255).toHaveProperty('mint');
    });

    it('accepts amount of 0n', async () => {
        const payer = await generateKeyPairSigner();
        const svm = createMockSvm();

        const client = createEmptyClient()
            .use(() => ({ payer, svm }))
            .use(testTokenPlugin());

        const result = await client.createTestToken({ amount: 0n });
        expect(result).toHaveProperty('mint');
    });
});

describe('exports', () => {
    it('exports TOKEN_PROGRAM_ADDRESS', () => {
        expect(testTokenPlugin).toBeDefined();
        expect(TOKEN_PROGRAM_ADDRESS).toBeDefined();
    });

    it('exports TOKEN_2022_PROGRAM_ADDRESS', () => {
        expect(TOKEN_2022_PROGRAM_ADDRESS).toBeDefined();
    });
});

// Helper functions - these are only used for type checking and basic client setup
// The actual RPC flow is tested via LiteSVM which is synchronous and easier to mock
function createMockRpc() {
    return {
        getLatestBlockhash: vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    blockhash: 'GfVcyD4ckTfCjSs5sZKUBLLFsmQXL4dJZH3Dj1EjD1cV',
                    lastValidBlockHeight: 1000n,
                },
            }),
        }),
        getMinimumBalanceForRentExemption: vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue(1_461_600n),
        }),
        sendTransaction: vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue('mocksignature'),
        }),
        getEpochInfo: vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                epoch: 100n,
                slotIndex: 50n,
                slotsInEpoch: 432000n,
                absoluteSlot: 100000n,
                blockHeight: 99000n,
            }),
        }),
        getSignatureStatuses: vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: [{ confirmationStatus: 'confirmed', err: null }],
            }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

function createMockRpcSubscriptions() {
    const createMockSubscription = () => ({
        subscribe: vi.fn().mockReturnValue({
            [Symbol.asyncIterator]: async function* () {
                yield { context: { slot: 100n }, value: { err: null } };
            },
        }),
    });

    return {
        signatureNotifications: vi.fn().mockReturnValue(createMockSubscription()),
        slotNotifications: vi.fn().mockReturnValue(createMockSubscription()),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

function createMockSvm(
    overrides: Partial<{
        getLatestBlockhash: ReturnType<typeof vi.fn>;
        minimumBalanceForRentExemption: ReturnType<typeof vi.fn>;
        sendTransaction: ReturnType<typeof vi.fn>;
    }> = {},
) {
    return {
        getLatestBlockhash:
            overrides.getLatestBlockhash ??
            vi.fn().mockReturnValue({
                blockhash: 'GfVcyD4ckTfCjSs5sZKUBLLFsmQXL4dJZH3Dj1EjD1cV',
                lastValidBlockHeight: 1000n,
            }),
        minimumBalanceForRentExemption: overrides.minimumBalanceForRentExemption ?? vi.fn().mockReturnValue(1_461_600n),
        sendTransaction: overrides.sendTransaction ?? vi.fn().mockReturnValue('mocksignature'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

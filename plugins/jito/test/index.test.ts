import { address, type Base64EncodedWireTransaction, generateKeyPairSigner } from '@solana/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createBundleBuilder,
    createJitoClient,
    createJitoTransport,
    getRandomTipAccount,
    jitoPlugin,
    JitoRpcError,
    MAX_BUNDLE_SIZE,
    validateBundle,
} from '../src';
import type { JitoApi, JitoPluginConfig } from '../src/types';

// Helper to create test transactions (cast for testing purposes)
const tx = (s: string) => s as Base64EncodedWireTransaction;

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockResponse(result: unknown) {
    return {
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
    };
}

function createMockErrorResponse(code: number, message: string) {
    return {
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, error: { code, message } }),
    };
}

function createMockHttpErrorResponse(status: number, statusText: string) {
    return {
        ok: false,
        status,
        statusText,
    };
}

const TEST_CONFIG: JitoPluginConfig = {
    endpoint: 'https://test.jito.wtf/api/v1',
};

const TEST_TIP_ACCOUNTS = [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    '2GjeBJEWf7VXS4Cqz8uJFd8ELo7SiWbdkPvC7LVG3xLD',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

// Valid base58 signature (88 chars)
const TEST_SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
const TEST_SIGNATURE_2 = '4vC38p4bz7XyiXrk6HtaooUqwxTWKocf45cstASGtmrD364xqpZdSxnRxvTXZb3vdkWGmJST4RuG4fJDAEHJGBQZ';

describe('createJitoTransport', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('makes JSON-RPC calls with correct format', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(['account1', 'account2']));

        const transport = createJitoTransport(TEST_CONFIG);
        await transport.call('getTipAccounts', []);

        expect(mockFetch).toHaveBeenCalledWith(TEST_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"method":"getTipAccounts"'),
        });
    });

    it('includes UUID header when configured', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([]));

        const transport = createJitoTransport({ ...TEST_CONFIG, uuid: 'test-uuid' });
        await transport.call('getTipAccounts', []);

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: {
                    'Content-Type': 'application/json',
                    'x-jito-auth': 'test-uuid',
                },
            }),
        );
    });

    it('throws JitoRpcError on RPC error response', async () => {
        mockFetch.mockResolvedValue(createMockErrorResponse(-32000, 'Test error'));

        const transport = createJitoTransport(TEST_CONFIG);

        await expect(transport.call('getTipAccounts', [])).rejects.toThrow(JitoRpcError);
        await expect(transport.call('getTipAccounts', [])).rejects.toThrow('Test error');
    });

    it('throws JitoRpcError on HTTP error', async () => {
        mockFetch.mockResolvedValue(createMockHttpErrorResponse(500, 'Internal Server Error'));

        const transport = createJitoTransport(TEST_CONFIG);

        await expect(transport.call('getTipAccounts', [])).rejects.toThrow(JitoRpcError);
        await expect(transport.call('getTipAccounts', [])).rejects.toThrow('500');
    });

    it('throws JitoRpcError on network error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const transport = createJitoTransport(TEST_CONFIG);

        await expect(transport.call('getTipAccounts', [])).rejects.toThrow(JitoRpcError);
        await expect(transport.call('getTipAccounts', [])).rejects.toThrow('Network error');
    });
});

describe('createJitoClient', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('getTipAccounts', () => {
        it('returns tip accounts as addresses', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(TEST_TIP_ACCOUNTS));

            const client = createJitoClient(TEST_CONFIG);
            const accounts = await client.getTipAccounts();

            expect(accounts).toHaveLength(3);
            expect(accounts[0]).toBe(TEST_TIP_ACCOUNTS[0]);
        });

        it('caches tip accounts', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(TEST_TIP_ACCOUNTS));

            const client = createJitoClient(TEST_CONFIG);
            await client.getTipAccounts();
            await client.getTipAccounts();

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('getRandomTipAccount', () => {
        it('returns a random tip account', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(TEST_TIP_ACCOUNTS));

            const client = createJitoClient(TEST_CONFIG);
            const account = await client.getRandomTipAccount();

            expect(TEST_TIP_ACCOUNTS).toContain(account);
        });
    });

    describe('sendBundle', () => {
        it('sends bundle and returns bundle ID', async () => {
            const bundleId = 'bundle-id-123';
            mockFetch.mockResolvedValueOnce(createMockResponse(bundleId));

            const client = createJitoClient(TEST_CONFIG);
            const result = await client.sendBundle([tx('tx1'), tx('tx2')]);

            expect(result).toBe(bundleId);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"method":"sendBundle"'),
                }),
            );
        });

        it('throws on empty bundle', async () => {
            const client = createJitoClient(TEST_CONFIG);

            await expect(client.sendBundle([])).rejects.toThrow('Bundle is empty');
        });

        it('throws on oversized bundle', async () => {
            const client = createJitoClient(TEST_CONFIG);
            const oversizedBundle = Array(6).fill(tx('tx'));

            await expect(client.sendBundle(oversizedBundle)).rejects.toThrow('exceeds maximum size');
        });
    });

    describe('getBundleStatuses', () => {
        it('returns bundle statuses with bigint slot', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    context: { slot: 12345 },
                    value: [
                        {
                            bundle_id: 'bundle-1',
                            transactions: [TEST_SIGNATURE, TEST_SIGNATURE_2],
                            slot: 12345,
                            confirmation_status: 'confirmed',
                            err: { Ok: null },
                        },
                    ],
                }),
            );

            const client = createJitoClient(TEST_CONFIG);
            const statuses = await client.getBundleStatuses(['bundle-1']);

            expect(statuses).toHaveLength(1);
            expect(statuses[0].slot).toBe(12345n);
            expect(statuses[0].confirmation_status).toBe('confirmed');
        });

        it('returns empty array for empty input', async () => {
            const client = createJitoClient(TEST_CONFIG);
            const statuses = await client.getBundleStatuses([]);

            expect(statuses).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('throws on more than 5 bundle IDs', async () => {
            const client = createJitoClient(TEST_CONFIG);
            const ids = Array(6).fill('id');

            await expect(client.getBundleStatuses(ids)).rejects.toThrow('more than 5');
        });
    });

    describe('getInflightBundleStatuses', () => {
        it('returns in-flight statuses', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    context: { slot: 12345 },
                    value: [
                        {
                            bundle_id: 'bundle-1',
                            status: 'Landed',
                            landed_slot: 12340,
                        },
                    ],
                }),
            );

            const client = createJitoClient(TEST_CONFIG);
            const statuses = await client.getInflightBundleStatuses(['bundle-1']);

            expect(statuses).toHaveLength(1);
            expect(statuses[0].status).toBe('Landed');
            expect(statuses[0].landed_slot).toBe(12340n);
        });
    });

    describe('sendTransaction', () => {
        it('sends transaction with options', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(TEST_SIGNATURE));

            const client = createJitoClient(TEST_CONFIG);
            const sig = await client.sendTransaction('encoded-tx', {
                encoding: 'base64',
                skipPreflight: true,
            });

            expect(sig).toBe(TEST_SIGNATURE);
        });
    });

    describe('simulateBundle', () => {
        it('returns simulation results with bigint values', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    context: { slot: 12345 },
                    value: {
                        summary: 'succeeded',
                        transactionResults: [
                            {
                                err: null,
                                logs: ['log1', 'log2'],
                                postExecutionAccounts: [
                                    {
                                        lamports: 1000000,
                                        owner: 'owner-pubkey',
                                        data: ['data'],
                                        executable: false,
                                        rentEpoch: 100,
                                    },
                                ],
                                unitsConsumed: 50000,
                                returnData: null,
                            },
                        ],
                    },
                }),
            );

            const client = createJitoClient(TEST_CONFIG);
            const result = await client.simulateBundle([tx('tx1')]);

            expect(result.summary).toBe('succeeded');
            expect(result.transactionResults[0].unitsConsumed).toBe(50000n);
            expect(result.transactionResults[0].postExecutionAccounts?.[0].lamports).toBe(1000000n);
        });

        it('throws on empty bundle', async () => {
            const client = createJitoClient(TEST_CONFIG);

            await expect(client.simulateBundle([])).rejects.toThrow('Bundle is empty');
        });
    });

    describe('createBundle', () => {
        it('returns a bundle builder', () => {
            const client = createJitoClient(TEST_CONFIG);
            const builder = client.createBundle();

            expect(builder.add).toBeDefined();
            expect(builder.send).toBeDefined();
            expect(builder.simulate).toBeDefined();
        });
    });
});

describe('helpers', () => {
    describe('getRandomTipAccount', () => {
        it('returns one of the provided accounts', () => {
            const accounts = TEST_TIP_ACCOUNTS.map(a => address(a));
            const result = getRandomTipAccount(accounts);

            expect(TEST_TIP_ACCOUNTS).toContain(result);
        });

        it('throws on empty array', () => {
            expect(() => getRandomTipAccount([])).toThrow('No tip accounts available');
        });
    });

    describe('validateBundle', () => {
        it('throws on empty bundle', () => {
            expect(() => validateBundle([])).toThrow('Bundle is empty');
        });

        it('throws on oversized bundle', () => {
            const oversized = Array(MAX_BUNDLE_SIZE + 1).fill(tx('tx'));
            expect(() => validateBundle(oversized)).toThrow('exceeds maximum size');
        });

        it('passes valid bundle', () => {
            expect(() => validateBundle([tx('tx1'), tx('tx2')])).not.toThrow();
        });
    });

    describe('createBundleBuilder', () => {
        let mockApi: JitoApi;

        beforeEach(() => {
            mockApi = {
                getTipAccounts: vi.fn(),
                getRandomTipAccount: vi.fn(),
                sendBundle: vi.fn().mockResolvedValue('bundle-id'),
                getBundleStatuses: vi.fn(),
                getInflightBundleStatuses: vi.fn(),
                sendTransaction: vi.fn(),
                simulateBundle: vi.fn().mockResolvedValue({ summary: 'succeeded', transactionResults: [] }),
                createBundle: vi.fn(),
            };
        });

        it('adds transactions', () => {
            const builder = createBundleBuilder(mockApi);
            builder.add(tx('tx1')).add(tx('tx2'));

            expect(builder.getBundle()).toEqual([tx('tx1'), tx('tx2')]);
        });

        it('adds many transactions', () => {
            const builder = createBundleBuilder(mockApi);
            builder.addMany([tx('tx1'), tx('tx2'), tx('tx3')]);

            expect(builder.getBundle()).toEqual([tx('tx1'), tx('tx2'), tx('tx3')]);
        });

        it('sends bundle via API', async () => {
            const builder = createBundleBuilder(mockApi);
            builder.add(tx('tx1'));
            const bundleId = await builder.send();

            expect(mockApi.sendBundle).toHaveBeenCalledWith([tx('tx1')]);
            expect(bundleId).toBe('bundle-id');
        });

        it('simulates bundle via API', async () => {
            const builder = createBundleBuilder(mockApi);
            builder.add(tx('tx1'));
            const result = await builder.simulate();

            expect(mockApi.simulateBundle).toHaveBeenCalledWith([tx('tx1')], undefined);
            expect(result.summary).toBe('succeeded');
        });
    });
});

describe('jitoPlugin', () => {
    it('throws if endpoint is missing', () => {
        expect(() => jitoPlugin({ endpoint: '' })).toThrow('Jito endpoint is required');
    });

    it('adds jito namespace to client', async () => {
        const payer = await generateKeyPairSigner();
        const client = { payer };

        const plugin = jitoPlugin(TEST_CONFIG);
        const extendedClient = plugin(client);

        expect(extendedClient.jito).toBeDefined();
        expect(extendedClient.jito.getTipAccounts).toBeDefined();
        expect(extendedClient.jito.sendBundle).toBeDefined();
        expect(extendedClient.jito.createBundle).toBeDefined();
        expect(extendedClient.payer).toBe(payer);
    });
});

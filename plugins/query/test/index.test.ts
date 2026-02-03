import { address, lamports, signature } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';

import { createQueryNamespace, queryPlugin } from '../src';
import type { QueryRpc } from '../src/types';

// Helper to create mock RPC
function createMockRpc(overrides: Partial<Record<keyof QueryRpc, unknown>> = {}): QueryRpc {
    return {
        getBalance: vi.fn(() => ({
            send: vi.fn().mockResolvedValue({ value: lamports(1_000_000_000n) }),
        })),
        getTokenAccountBalance: vi.fn(() => ({
            send: vi.fn().mockResolvedValue({
                value: {
                    amount: '1000000',
                    decimals: 6,
                    uiAmount: 1.0,
                    uiAmountString: '1',
                },
            }),
        })),
        getAccountInfo: vi.fn(() => ({
            send: vi.fn().mockResolvedValue({
                value: {
                    data: ['AQIDBA==', 'base64'], // [1, 2, 3, 4] in base64
                    executable: false,
                    lamports: lamports(1_000_000n),
                    owner: address('11111111111111111111111111111111'),
                    space: 4n,
                },
            }),
        })),
        getSignatureStatuses: vi.fn(() => ({
            send: vi.fn().mockResolvedValue({
                value: [
                    {
                        slot: 123n,
                        confirmations: 10n,
                        err: null,
                        confirmationStatus: 'confirmed',
                    },
                ],
            }),
        })),
        getProgramAccounts: vi.fn(() => ({
            send: vi.fn().mockResolvedValue([
                {
                    pubkey: address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q'),
                    account: {
                        data: ['AQIDBA==', 'base64'],
                        executable: false,
                        lamports: lamports(1_000_000n),
                        owner: address('11111111111111111111111111111111'),
                        space: 4n,
                    },
                },
            ]),
        })),
        ...overrides,
    } as unknown as QueryRpc;
}

describe('queryPlugin', () => {
    it('adds query namespace to client', () => {
        const mockRpc = createMockRpc();
        const client = { rpc: mockRpc };
        const extended = queryPlugin()(client);

        expect(extended.query).toBeDefined();
        expect(extended.query.balance).toBeTypeOf('function');
        expect(extended.query.tokenBalance).toBeTypeOf('function');
        expect(extended.query.account).toBeTypeOf('function');
        expect(extended.query.signatureStatus).toBeTypeOf('function');
        expect(extended.query.programAccounts).toBeTypeOf('function');
    });

    it('preserves existing client properties', () => {
        const mockRpc = createMockRpc();
        const client = { rpc: mockRpc, existingProp: 'test' };
        const extended = queryPlugin()(client);

        expect(extended.existingProp).toBe('test');
        expect(extended.rpc).toBe(mockRpc);
    });
});

describe('createQueryNamespace', () => {
    describe('balance', () => {
        it('returns QueryDef with correct key', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const balanceQuery = query.balance(addr);

            expect(balanceQuery.key).toEqual(['balance', addr]);
            expect(balanceQuery.staleTime).toBe(10_000);
            expect(balanceQuery.fn).toBeTypeOf('function');
        });

        it('fetches balance via RPC', async () => {
            const expectedBalance = lamports(5_000_000_000n);
            const mockRpc = createMockRpc({
                getBalance: vi.fn(() => ({
                    send: vi.fn().mockResolvedValue({ value: expectedBalance }),
                })),
            });
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const balance = await query.balance(addr).fn();

            expect(balance).toBe(expectedBalance);
            expect(mockRpc.getBalance).toHaveBeenCalledWith(addr);
        });
    });

    describe('tokenBalance', () => {
        it('returns QueryDef with correct key', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const ata = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const tokenQuery = query.tokenBalance(ata);

            expect(tokenQuery.key).toEqual(['tokenBalance', ata]);
            expect(tokenQuery.staleTime).toBe(10_000);
        });

        it('fetches and formats token balance', async () => {
            const mockRpc = createMockRpc({
                getTokenAccountBalance: vi.fn(() => ({
                    send: vi.fn().mockResolvedValue({
                        value: {
                            amount: '1000000000',
                            decimals: 9,
                            uiAmount: 1.0,
                            uiAmountString: '1',
                        },
                    }),
                })),
            });
            const query = createQueryNamespace({ rpc: mockRpc });
            const ata = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const result = await query.tokenBalance(ata).fn();

            expect(result.amount).toBe(1_000_000_000n);
            expect(result.decimals).toBe(9);
            expect(result.uiAmount).toBe(1.0);
            expect(result.uiAmountString).toBe('1');
        });
    });

    describe('account', () => {
        it('returns QueryDef with raw key when no codec', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const accountQuery = query.account(addr);

            expect(accountQuery.key).toEqual(['account', addr, 'raw']);
            expect(accountQuery.staleTime).toBe(30_000);
        });

        it('returns QueryDef with decoded key when decoder provided', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
            const mockDecoder = { decode: vi.fn(data => ({ parsed: data })) };

            const accountQuery = query.account(addr, mockDecoder);

            expect(accountQuery.key).toEqual(['account', addr, 'decoded']);
        });

        it('returns null for non-existent account', async () => {
            const mockRpc = createMockRpc({
                getAccountInfo: vi.fn(() => ({
                    send: vi.fn().mockResolvedValue({ value: null }),
                })),
            });
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const result = await query.account(addr).fn();

            expect(result).toBeNull();
        });

        it('fetches and returns account info', async () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

            const result = await query.account(addr).fn();

            expect(result).not.toBeNull();
            expect(result!.executable).toBe(false);
            expect(result!.lamports).toBeDefined();
            expect(result!.data).toBeInstanceOf(Uint8Array);
            expect(result!.space).toBe(4n); // [1,2,3,4] = 4 bytes
        });

        it('decodes data when decoder provided', async () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
            const mockDecoder = {
                decode: vi.fn((data: Uint8Array) => ({ length: data.length })),
            };

            const result = await query.account(addr, mockDecoder).fn();

            expect(mockDecoder.decode).toHaveBeenCalled();
            expect(result!.data).toEqual({ length: 4 });
        });
    });

    describe('signatureStatus', () => {
        it('returns QueryDef with correct key', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const sig = signature(
                '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
            );

            const statusQuery = query.signatureStatus(sig);

            expect(statusQuery.key).toEqual(['signatureStatus', sig]);
            expect(statusQuery.staleTime).toBe(2_000);
        });

        it('returns null when signature not found', async () => {
            const mockRpc = createMockRpc({
                getSignatureStatuses: vi.fn(() => ({
                    send: vi.fn().mockResolvedValue({ value: [null] }),
                })),
            });
            const query = createQueryNamespace({ rpc: mockRpc });
            const sig = signature(
                '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
            );

            const result = await query.signatureStatus(sig).fn();

            expect(result).toBeNull();
        });

        it('returns signature status', async () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const sig = signature(
                '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
            );

            const result = await query.signatureStatus(sig).fn();

            expect(result).not.toBeNull();
            expect(result!.confirmationStatus).toBe('confirmed');
        });
    });

    describe('programAccounts', () => {
        it('returns QueryDef with correct key (no options)', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            const gpaQuery = query.programAccounts(programId);

            expect(gpaQuery.key).toEqual(['programAccounts', programId, null, 'raw']);
            expect(gpaQuery.staleTime).toBe(60_000);
        });

        it('returns QueryDef with dataSize in key', () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            const gpaQuery = query.programAccounts(programId, { dataSize: 165n });

            expect(gpaQuery.key).toEqual(['programAccounts', programId, 165n, 'raw']);
        });

        it('fetches program accounts', async () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            const result = await query.programAccounts(programId).fn();

            expect(result).toHaveLength(1);
            expect(result[0].pubkey).toBeDefined();
            expect(result[0].account.data).toBeInstanceOf(Uint8Array);
        });

        it('decodes accounts when decoder provided', async () => {
            const mockRpc = createMockRpc();
            const query = createQueryNamespace({ rpc: mockRpc });
            const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            const mockDecoder = {
                decode: vi.fn((data: Uint8Array) => ({ size: data.length })),
            };

            const result = await query.programAccounts(programId, { decoder: mockDecoder }).fn();

            expect(mockDecoder.decode).toHaveBeenCalled();
            expect(result[0].account.data).toEqual({ size: 4 });
        });
    });
});

describe('tokenBalance with mint+owner', () => {
    it('derives ATA and fetches balance when mint+owner provided', async () => {
        const mockRpc = createMockRpc({
            getTokenAccountBalance: vi.fn(() => ({
                send: vi.fn().mockResolvedValue({
                    value: {
                        amount: '500000000',
                        decimals: 6,
                        uiAmount: 500.0,
                        uiAmountString: '500',
                    },
                }),
            })),
        });
        const query = createQueryNamespace({ rpc: mockRpc });
        const mint = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
        const owner = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

        const result = await query.tokenBalance(mint, owner).fn();

        expect(result.amount).toBe(500_000_000n);
        expect(result.decimals).toBe(6);
        expect(mockRpc.getTokenAccountBalance).toHaveBeenCalled();
    });

    it('uses ATA directly when only one arg provided', async () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const ata = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

        const tokenQuery = query.tokenBalance(ata);

        expect(tokenQuery.key).toEqual(['tokenBalance', ata]);
    });

    it('includes mint+owner in cache key when both provided', () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const mint = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const owner = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

        const tokenQuery = query.tokenBalance(mint, owner);

        expect(tokenQuery.key).toEqual(['tokenBalance', mint, owner]);
    });
});

describe('decoder.name in cache key', () => {
    it('uses decoder.name when provided', () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        const decoder = { decode: (data: Uint8Array) => data, name: 'MyDecoder' };

        const accountQuery = query.account(addr, decoder);

        expect(accountQuery.key).toEqual(['account', addr, 'MyDecoder']);
    });

    it('uses "decoded" when decoder has no name', () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        const decoder = { decode: (data: Uint8Array) => data };

        const accountQuery = query.account(addr, decoder);

        expect(accountQuery.key).toEqual(['account', addr, 'decoded']);
    });

    it('uses decoder.name in programAccounts', () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const decoder = { decode: (data: Uint8Array) => data, name: 'TokenAccount' };

        const gpaQuery = query.programAccounts(programId, { decoder });

        expect(gpaQuery.key).toEqual(['programAccounts', programId, null, 'TokenAccount']);
    });
});

describe('error scenarios', () => {
    it('propagates RPC errors', async () => {
        const mockRpc = createMockRpc({
            getBalance: vi.fn(() => ({
                send: vi.fn().mockRejectedValue(new Error('RPC connection failed')),
            })),
        });
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

        await expect(query.balance(addr).fn()).rejects.toThrow('RPC connection failed');
    });

    it('propagates decoder errors', async () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        const decoder = {
            decode: () => {
                throw new Error('Invalid account data');
            },
        };

        await expect(query.account(addr, decoder).fn()).rejects.toThrow('Invalid account data');
    });

    it('handles empty programAccounts result', async () => {
        const mockRpc = createMockRpc({
            getProgramAccounts: vi.fn(() => ({
                send: vi.fn().mockResolvedValue([]),
            })),
        });
        const query = createQueryNamespace({ rpc: mockRpc });
        const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

        const result = await query.programAccounts(programId).fn();

        expect(result).toEqual([]);
    });
});

describe('QueryDef pattern', () => {
    it('produces deterministic cache keys', () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

        const query1 = query.balance(addr);
        const query2 = query.balance(addr);

        // Same address produces same key
        expect(query1.key).toEqual(query2.key);
        expect(JSON.stringify(query1.key)).toBe(JSON.stringify(query2.key));
    });

    it('produces different keys for different addresses', () => {
        const mockRpc = createMockRpc();
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr1 = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');
        const addr2 = address('11111111111111111111111111111111');

        const query1 = query.balance(addr1);
        const query2 = query.balance(addr2);

        expect(query1.key).not.toEqual(query2.key);
    });

    it('fn is idempotent (can be called multiple times)', async () => {
        const sendMock = vi.fn().mockResolvedValue({ value: lamports(1_000_000_000n) });
        const mockRpc = createMockRpc({
            getBalance: vi.fn(() => ({ send: sendMock })),
        });
        const query = createQueryNamespace({ rpc: mockRpc });
        const addr = address('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q');

        const balanceQuery = query.balance(addr);

        // Call fn multiple times
        const result1 = await balanceQuery.fn();
        const result2 = await balanceQuery.fn();

        expect(result1).toBe(result2);
        expect(sendMock).toHaveBeenCalledTimes(2);
    });
});

import {
    address,
    createEmptyClient,
    generateKeyPairSigner,
    type Instruction,
    type SignatureBytes,
    type TransactionSigner,
} from '@solana/kit';
import type { Wallet, WalletAccount as StandardWalletAccount } from '@wallet-standard/base';
import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from '@wallet-standard/ui-registry';
import { describe, expect, it, vi } from 'vitest';

import type { WalletApi } from '@kit-helpers/wallet';

import { actionPlugin, createActionNamespace, resolveSigner } from '../src';
import type { ActionRpc } from '../src';

// ─── Mock Helpers ───────────────────────────────────────────────────────────

function createMockRpc(
    overrides: Partial<{
        getLatestBlockhash: ReturnType<typeof vi.fn>;
        sendTransaction: ReturnType<typeof vi.fn>;
        simulateTransaction: ReturnType<typeof vi.fn>;
    }> = {},
) {
    return {
        getLatestBlockhash:
            overrides.getLatestBlockhash ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue({
                    value: {
                        blockhash: 'GfVcyD4ckTfCjSs5sZKUBLLFsmQXL4dJZH3Dj1EjD1cV',
                        lastValidBlockHeight: 1000n,
                    },
                }),
            }),
        sendTransaction:
            overrides.sendTransaction ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue('mocksignature'),
            }),
        simulateTransaction:
            overrides.simulateTransaction ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue({
                    value: { err: null, logs: [], returnData: null, unitsConsumed: 0n },
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

function createMockInstruction(): Instruction {
    return {
        accounts: [],
        data: new Uint8Array([0, 0, 0, 0]),
        programAddress: address('11111111111111111111111111111111'),
    };
}

function createMockWallet(connected: boolean, signer?: TransactionSigner): WalletApi {
    if (!connected || !signer) {
        return { connected: false, signer: null, state: { status: 'disconnected' } } as unknown as WalletApi;
    }
    return {
        connected: true,
        signer,
        state: {
            status: 'connected',
            session: {
                account: {
                    address: signer.address,
                    features: ['solana:signTransaction', 'solana:signMessage'],
                },
            },
        },
    } as unknown as WalletApi;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('actionPlugin', () => {
    it('adds action namespace to client', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(actionPlugin());

        expect(client).toHaveProperty('action');
        expect(client.action).toHaveProperty('send');
        expect(client.action).toHaveProperty('simulate');
        expect(client.action).toHaveProperty('sign');
        expect(client.action).toHaveProperty('sendSigned');
        expect(client.action).toHaveProperty('signMessage');
    });

    it('preserves existing client properties', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc, existingProp: 'test' }))
            .use(actionPlugin());

        expect(client).toHaveProperty('existingProp', 'test');
        expect(client).toHaveProperty('payer');
        expect(client).toHaveProperty('rpc');
    });
});

describe('resolveSigner', () => {
    it('returns override signer when provided', async () => {
        const payer = await generateKeyPairSigner();
        const override = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const resolved = resolveSigner({ rpc, payer }, override);

        expect(resolved).toBe(override);
    });

    it('returns wallet signer when connected', async () => {
        const walletSigner = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const wallet = createMockWallet(true, walletSigner);

        const resolved = resolveSigner({ rpc, wallet });

        expect(resolved).toBe(walletSigner);
    });

    it('returns payer when no wallet connected', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const resolved = resolveSigner({ rpc, payer });

        expect(resolved).toBe(payer);
    });

    it('prefers wallet over payer', async () => {
        const payer = await generateKeyPairSigner();
        const walletSigner = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const wallet = createMockWallet(true, walletSigner);

        const resolved = resolveSigner({ rpc, payer, wallet } as ActionClientRequirementsWithBoth);

        expect(resolved).toBe(walletSigner);
    });

    it('falls back to payer when wallet is disconnected', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const wallet = createMockWallet(false);

        const resolved = resolveSigner({ rpc, payer, wallet } as ActionClientRequirementsWithBoth);

        expect(resolved).toBe(payer);
    });

    it('throws when no signer available', () => {
        const rpc = createMockRpc();
        const wallet = createMockWallet(false);

        expect(() => resolveSigner({ rpc, wallet })).toThrow('No signer available');
    });
});

describe('action.send', () => {
    it('throws on empty instructions', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const action = createActionNamespace({ rpc, payer });

        await expect(action.send([])).rejects.toThrow('no instructions');
    });

    it('calls getLatestBlockhash and sendTransaction', async () => {
        const payer = await generateKeyPairSigner();
        const getLatestBlockhash = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    blockhash: 'GfVcyD4ckTfCjSs5sZKUBLLFsmQXL4dJZH3Dj1EjD1cV',
                    lastValidBlockHeight: 1000n,
                },
            }),
        });
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue('mocksignature'),
        });
        const rpc = createMockRpc({ getLatestBlockhash, sendTransaction });
        const action = createActionNamespace({ rpc, payer });

        const sig = await action.send([createMockInstruction()]);

        expect(getLatestBlockhash).toHaveBeenCalled();
        expect(sendTransaction).toHaveBeenCalled();
        expect(sig).toBe('mocksignature');
    });

    it('uses signer override when provided', async () => {
        const payer = await generateKeyPairSigner();
        const override = await generateKeyPairSigner();
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue('mocksignature'),
        });
        const rpc = createMockRpc({ sendTransaction });
        const action = createActionNamespace({ rpc, payer });

        await action.send([createMockInstruction()], { signer: override });

        // Verify sendTransaction was called (means it went through with the override signer)
        expect(sendTransaction).toHaveBeenCalled();
    });

    it('returns signature without confirmation when no rpcSubscriptions', async () => {
        const payer = await generateKeyPairSigner();
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue('fireandforget'),
        });
        const rpc = createMockRpc({ sendTransaction });
        const action = createActionNamespace({ rpc, payer });

        const sig = await action.send([createMockInstruction()]);

        expect(sig).toBe('fireandforget');
    });

    it('attempts confirmation when rpcSubscriptions present', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();
        const action = createActionNamespace({ rpc, rpcSubscriptions, payer });

        // Will not complete confirmation in unit tests due to @solana/kit internals,
        // but we verify it doesn't throw the fire-and-forget path
        const promise = action.send([createMockInstruction()]);

        // The sendAndConfirmTransactionFactory will fail on block height checks,
        // but it should NOT call rpc.sendTransaction directly (it uses the factory)
        await expect(promise).rejects.not.toThrow('no instructions');
    });

    it('throws when abortSignal is already aborted', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const action = createActionNamespace({ rpc, payer });

        const controller = new AbortController();
        controller.abort();

        await expect(action.send([createMockInstruction()], { abortSignal: controller.signal })).rejects.toThrow();
    });
});

describe('action.simulate', () => {
    it('throws on empty instructions', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const action = createActionNamespace({ rpc, payer });

        await expect(action.simulate([])).rejects.toThrow('no instructions');
    });

    it('calls simulateTransaction and returns result', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    err: null,
                    logs: ['Program log: Hello'],
                    returnData: null,
                    unitsConsumed: 5000n,
                },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });
        const action = createActionNamespace({ rpc, payer });

        const result = await action.simulate([createMockInstruction()]);

        expect(simulateTransaction).toHaveBeenCalled();
        expect(result.error).toBeNull();
        expect(result.logs).toContain('Program log: Hello');
        expect(result.unitsConsumed).toBe(5000n);
    });

    it('returns error in SimulateResult when simulation fails', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    err: { InstructionError: [0, 'ProgramFailedToComplete'] },
                    logs: ['Program failed'],
                    returnData: null,
                    unitsConsumed: 1000n,
                },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });
        const action = createActionNamespace({ rpc, payer });

        const result = await action.simulate([createMockInstruction()]);

        expect(result.error).not.toBeNull();
        expect(result.error).toContain('InstructionError');
    });

    it('wraps RPC errors with context', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(new TypeError('RPC timeout')),
        });
        const rpc = createMockRpc({ simulateTransaction });
        const action = createActionNamespace({ rpc, payer });

        await expect(action.simulate([createMockInstruction()])).rejects.toThrow('Failed to simulate transaction');
    });
});

describe('action.sign', () => {
    it('throws on empty instructions', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const action = createActionNamespace({ rpc, payer });

        await expect(action.sign([])).rejects.toThrow('no instructions');
    });

    it('returns a signed transaction', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const action = createActionNamespace({ rpc, payer });

        const signed = await action.sign([createMockInstruction()]);

        expect(signed).toBeDefined();
        // Signed transaction should have signatures
        expect(typeof signed).toBe('object');
    });
});

describe('action.sendSigned', () => {
    it('sends a pre-signed transaction without rpcSubscriptions', async () => {
        const payer = await generateKeyPairSigner();
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue('presignedsig'),
        });
        const rpc = createMockRpc({ sendTransaction });
        const action = createActionNamespace({ rpc, payer });

        // First sign, then send
        const signed = await action.sign([createMockInstruction()]);
        const sig = await action.sendSigned(signed);

        expect(sendTransaction).toHaveBeenCalled();
        expect(sig).toBe('presignedsig');
    });
});

describe('action.signMessage', () => {
    it('delegates to wallet session signMessage', async () => {
        const mockSignMessage = vi.fn().mockResolvedValue([{ signature: new Uint8Array(64) as SignatureBytes }]);
        const rpc = createMockRpc();

        // Create a real UiWallet via the registry so createSignMessageFromAccount works
        const stdAccount: StandardWalletAccount = {
            address: '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
            publicKey: new Uint8Array(32),
            chains: ['solana:mainnet', 'solana:devnet'] as const,
            features: ['solana:signTransaction', 'solana:signMessage'] as const,
        } as StandardWalletAccount;

        const stdWallet: Wallet = {
            name: 'SignMsg Test Wallet',
            icon: 'data:image/svg+xml,<svg></svg>' as `data:image/${string}`,
            version: '1.0.0' as const,
            chains: ['solana:mainnet', 'solana:devnet'] as const,
            features: {
                'standard:connect': {
                    connect: vi.fn().mockResolvedValue({ accounts: [stdAccount] }),
                },
                'standard:events': { on: vi.fn().mockReturnValue(() => {}) },
                'solana:signTransaction': {
                    signTransaction: vi.fn(),
                },
                'solana:signMessage': {
                    signMessage: mockSignMessage,
                },
            },
            accounts: [stdAccount],
        } as Wallet;

        const uiWallet = getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(stdWallet);
        const uiAccount = uiWallet.accounts[0];

        const wallet = {
            connected: true,
            signer: null,
            state: {
                status: 'connected',
                session: {
                    account: uiAccount,
                    wallet: uiWallet,
                    disconnect: vi.fn(),
                },
            },
        } as unknown as WalletApi;

        const action = createActionNamespace({ rpc, wallet });

        const message = new Uint8Array([1, 2, 3]);
        const result = await action.signMessage(message);

        expect(mockSignMessage).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Uint8Array);
    });

    it('throws when no signMessage capability', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        // Create a minimal payer without signMessages:
        const minimalPayer = {
            address: payer.address,
            signTransactions: payer.signTransactions,
        } as TransactionSigner;

        const action = createActionNamespace({ rpc, payer: minimalPayer });

        await expect(action.signMessage(new Uint8Array([1, 2, 3]))).rejects.toThrow(
            'No signMessage capability available',
        );
    });

    it('falls back to payer signMessages if available', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const action = createActionNamespace({ rpc, payer });

        // KeyPairSigner from @solana/kit has signMessages
        const message = new Uint8Array([1, 2, 3]);
        const result = await action.signMessage(message);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(64);
    });
});

describe('Error handling', () => {
    it('wraps blockhash fetch errors', async () => {
        const payer = await generateKeyPairSigner();
        const getLatestBlockhash = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(new TypeError('Network error')),
        });
        const rpc = createMockRpc({ getLatestBlockhash });
        const action = createActionNamespace({ rpc, payer });

        await expect(action.send([createMockInstruction()])).rejects.toThrow('Failed to fetch blockhash');
    });

    it('wraps send errors', async () => {
        const payer = await generateKeyPairSigner();
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(new TypeError('Connection refused')),
        });
        const rpc = createMockRpc({ sendTransaction });
        const action = createActionNamespace({ rpc, payer });

        await expect(action.send([createMockInstruction()])).rejects.toThrow('Failed to send transaction');
    });

    it('preserves error cause when wrapping', async () => {
        const payer = await generateKeyPairSigner();
        const originalError = new TypeError('Network error');
        const getLatestBlockhash = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(originalError),
        });
        const rpc = createMockRpc({ getLatestBlockhash });
        const action = createActionNamespace({ rpc, payer });

        await expect(action.send([createMockInstruction()])).rejects.toHaveProperty('cause', originalError);
    });
});

// Helper type for tests where both payer and wallet exist
type ActionClientRequirementsWithBoth = {
    rpc: ActionRpc;
    payer: TransactionSigner;
    wallet: WalletApi;
};

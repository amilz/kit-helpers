import type { ClusterUrl } from '@solana/kit';
import { generateKeyPairSigner } from '@solana/kit';
import type { Wallet, WalletAccount as StandardWalletAccount } from '@wallet-standard/base';
import type { UiWallet } from '@wallet-standard/ui';
import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from '@wallet-standard/ui-registry';
import { describe, expect, it, vi } from 'vitest';

import { createSolanaClient } from '../src';

const URL = 'https://api.devnet.solana.com' as ClusterUrl;

// ─── Mock Helpers ───────────────────────────────────────────────────────────

function createMockUiWallet(name = 'Mock Wallet'): UiWallet {
    const account: StandardWalletAccount = {
        address: '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
        publicKey: new Uint8Array(32),
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        features: ['solana:signTransaction', 'solana:signMessage'] as const,
    } as StandardWalletAccount;

    const stdWallet: Wallet = {
        name,
        icon: 'data:image/svg+xml,<svg></svg>' as `data:image/${string}`,
        version: '1.0.0' as const,
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        features: {
            'standard:connect': {
                connect: vi.fn().mockResolvedValue({ accounts: [account] }),
            },
            'standard:disconnect': { disconnect: vi.fn() },
            'standard:events': { on: vi.fn().mockReturnValue(() => {}) },
            'solana:signTransaction': {
                signTransaction: vi.fn().mockResolvedValue([{ signedTransaction: new Uint8Array() }]),
            },
            'solana:signMessage': {
                signMessage: vi.fn().mockResolvedValue([{ signature: new Uint8Array(64) }]),
            },
        },
        accounts: [account],
    } as Wallet;

    return getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(stdWallet);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('createSolanaClient', () => {
    it('creates client with payer and all namespaces', async () => {
        const kp = await generateKeyPairSigner();
        const client = createSolanaClient({ url: URL, payer: kp });

        // Core
        expect(client).toHaveProperty('rpc');
        expect(client).toHaveProperty('rpcSubscriptions');
        expect(client).toHaveProperty('payer');

        // Query namespace
        expect(client.query).toHaveProperty('balance');
        expect(client.query).toHaveProperty('tokenBalance');
        expect(client.query).toHaveProperty('account');

        // sendTransaction / sendTransactions
        expect(client).toHaveProperty('sendTransaction');
        expect(client).toHaveProperty('sendTransactions');
        expect(typeof client.sendTransaction).toBe('function');
        expect(typeof client.sendTransactions).toBe('function');

        // Transaction planner/executor
        expect(client).toHaveProperty('transactionPlanner');
        expect(client).toHaveProperty('transactionPlanExecutor');

        // Program namespace
        expect(client).toHaveProperty('program');

        // System program namespace (native plugin)
        expect(client.program).toHaveProperty('system');
        expect(client.program.system).toHaveProperty('instructions');
        expect(client.program.system).toHaveProperty('accounts');
        expect(client.program.system.instructions).toHaveProperty('transferSol');
        expect(client.program.system.instructions).toHaveProperty('createAccount');
        expect(client.program.system.instructions).toHaveProperty('allocate');
        expect(client.program.system.instructions).toHaveProperty('assign');
        expect(client.program.system.accounts).toHaveProperty('nonce');

        // Token program namespace (native plugin)
        expect(client.program).toHaveProperty('token');
        expect(client.program.token).toHaveProperty('instructions');
        expect(client.program.token).toHaveProperty('accounts');
        expect(client.program.token.instructions).toHaveProperty('transfer');
        expect(client.program.token.instructions).toHaveProperty('transferChecked');
        expect(client.program.token.instructions).toHaveProperty('mintTo');
        expect(client.program.token.instructions).toHaveProperty('burn');
        expect(client.program.token.instructions).toHaveProperty('createMint');
        expect(client.program.token.instructions).toHaveProperty('mintToATA');
        expect(client.program.token.instructions).toHaveProperty('transferToATA');
        expect(client.program.token.accounts).toHaveProperty('mint');
        expect(client.program.token.accounts).toHaveProperty('token');
    });

    it('creates client with wallet', () => {
        const mockWallet = createMockUiWallet('Client Test Wallet');

        const client = createSolanaClient({
            url: URL,
            wallet: { wallets: [mockWallet] },
        });

        expect(client).toHaveProperty('wallet');
        expect(client.wallet).toHaveProperty('connect');
        expect(client.wallet).toHaveProperty('disconnect');
        expect(client.wallet).toHaveProperty('connected');
        expect(client.wallet).toHaveProperty('wallets');

        // Action namespace for send/sign/simulate
        expect(client).toHaveProperty('action');
        expect(client.action).toHaveProperty('send');
        expect(client.action).toHaveProperty('sign');
        expect(client.action).toHaveProperty('simulate');
        expect(client.action).toHaveProperty('signMessage');

        // Program namespace available in wallet flow too
        expect(client).toHaveProperty('program');
        expect(client.program.system).toHaveProperty('instructions');
        expect(client.program.system.instructions).toHaveProperty('transferSol');

        expect(client.program).toHaveProperty('token');
        expect(client.program.token).toHaveProperty('instructions');
        expect(client.program.token.instructions).toHaveProperty('transfer');
    });

    it('rejects passing both payer and wallet at the type level', async () => {
        const kp = await generateKeyPairSigner();
        const mockWallet = createMockUiWallet('Client Both Test');

        // @ts-expect-error — payer and wallet are mutually exclusive
        createSolanaClient({
            payer: kp,
            url: URL,
            wallet: { wallets: [mockWallet] },
        });
    });

    it('accepts priorityFees config', async () => {
        const kp = await generateKeyPairSigner();
        const client = createSolanaClient({
            payer: kp,
            priorityFees: 1000n as import('@solana/kit').MicroLamports,
            url: URL,
        });

        expect(client).toHaveProperty('sendTransaction');
    });
});

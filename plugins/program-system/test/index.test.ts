import { address, createEmptyClient, generateKeyPairSigner, type TransactionSigner } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { createSystemProgramNamespace, resolveSigner, systemProgramPlugin } from '../src';
import type { WalletLike } from '../src';

// ─── Mock Helpers ───────────────────────────────────────────────────────────

function createMockWallet(connected: boolean, signer?: TransactionSigner): WalletLike {
    if (!connected || !signer) {
        return { connected: false };
    }
    return {
        connected: true,
        state: {
            status: 'connected',
            session: { signer },
        },
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('systemProgramPlugin', () => {
    it('adds program.system namespace to client', async () => {
        const payer = await generateKeyPairSigner();

        const client = createEmptyClient()
            .use(() => ({ payer }))
            .use(systemProgramPlugin());

        expect(client).toHaveProperty('program');
        expect(client.program).toHaveProperty('system');
        expect(client.program.system).toHaveProperty('transfer');
        expect(client.program.system).toHaveProperty('createAccount');
        expect(client.program.system).toHaveProperty('allocate');
        expect(client.program.system).toHaveProperty('assign');
    });

    it('preserves existing client properties', async () => {
        const payer = await generateKeyPairSigner();

        const client = createEmptyClient()
            .use(() => ({ payer, existingProp: 'test' }))
            .use(systemProgramPlugin());

        expect(client).toHaveProperty('existingProp', 'test');
        expect(client).toHaveProperty('payer');
    });

    it('merges with existing program namespace', async () => {
        const payer = await generateKeyPairSigner();

        const client = createEmptyClient()
            .use(() => ({ payer, program: { token: { mint: () => 'mock' } } }))
            .use(systemProgramPlugin());

        expect(client.program).toHaveProperty('token');
        expect(client.program).toHaveProperty('system');
        expect((client.program as Record<string, unknown>).token).toHaveProperty('mint');
    });
});

describe('resolveSigner', () => {
    it('returns wallet signer when connected', async () => {
        const walletSigner = await generateKeyPairSigner();
        const wallet = createMockWallet(true, walletSigner);

        const resolved = resolveSigner({ wallet });

        expect(resolved).toBe(walletSigner);
    });

    it('returns payer when no wallet', async () => {
        const payer = await generateKeyPairSigner();

        const resolved = resolveSigner({ payer });

        expect(resolved).toBe(payer);
    });

    it('prefers wallet over payer', async () => {
        const payer = await generateKeyPairSigner();
        const walletSigner = await generateKeyPairSigner();
        const wallet = createMockWallet(true, walletSigner);

        const resolved = resolveSigner({ payer, wallet });

        expect(resolved).toBe(walletSigner);
    });

    it('falls back to payer when wallet is disconnected', async () => {
        const payer = await generateKeyPairSigner();
        const wallet = createMockWallet(false);

        const resolved = resolveSigner({ payer, wallet });

        expect(resolved).toBe(payer);
    });

    it('throws when no signer available', () => {
        const wallet = createMockWallet(false);

        expect(() => resolveSigner({ wallet })).toThrow('No signer available');
    });

    it('throws when client has neither payer nor wallet', () => {
        expect(() => resolveSigner({})).toThrow('No signer available');
    });
});

describe('system program instructions', () => {
    it('transfer returns an instruction', async () => {
        const payer = await generateKeyPairSigner();
        const dest = address('11111111111111111111111111111111');
        const ns = createSystemProgramNamespace({ payer });

        const ix = ns.transfer({ destination: dest, amount: 1_000_000n });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });

    it('createAccount returns an instruction', async () => {
        const payer = await generateKeyPairSigner();
        const newAccount = await generateKeyPairSigner();
        const programAddress = address('11111111111111111111111111111111');
        const ns = createSystemProgramNamespace({ payer });

        const ix = ns.createAccount({
            newAccount,
            lamports: 1_000_000n,
            space: 100n,
            programAddress,
        });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });

    it('allocate returns an instruction', async () => {
        const newAccount = await generateKeyPairSigner();
        const payer = await generateKeyPairSigner();
        const ns = createSystemProgramNamespace({ payer });

        const ix = ns.allocate({ newAccount, space: 100n });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });

    it('assign returns an instruction', async () => {
        const account = await generateKeyPairSigner();
        const programAddress = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const payer = await generateKeyPairSigner();
        const ns = createSystemProgramNamespace({ payer });

        const ix = ns.assign({ account, programAddress });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });
});

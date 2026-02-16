import { address, createEmptyClient, generateKeyPairSigner, type TransactionSigner } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import type { WalletApi } from '@kit-helpers/wallet';

import { createTokenProgramNamespace, resolveSigner, tokenProgramPlugin } from '../src';

// ─── Constants ──────────────────────────────────────────────────────────────

// Valid base58 addresses that decode to 32 bytes
const ADDR_1 = address('11111111111111111111111111111111');
const ADDR_2 = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ADDR_3 = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const ADDR_4 = address('SysvarRent111111111111111111111111111111111');

// ─── Mock Helpers ───────────────────────────────────────────────────────────

function createMockWallet(connected: boolean, signer?: TransactionSigner): WalletApi {
    if (!connected || !signer) {
        return { connected: false, signer: null, state: { status: 'disconnected' } } as unknown as WalletApi;
    }
    return {
        connected: true,
        signer,
        state: { status: 'connected' },
    } as unknown as WalletApi;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('tokenProgramPlugin', () => {
    it('adds program.token namespace to client', async () => {
        const payer = await generateKeyPairSigner();

        const client = createEmptyClient()
            .use(() => ({ payer }))
            .use(tokenProgramPlugin());

        expect(client).toHaveProperty('program');
        expect(client.program).toHaveProperty('token');
        expect(client.program.token).toHaveProperty('transfer');
        expect(client.program.token).toHaveProperty('transferChecked');
        expect(client.program.token).toHaveProperty('createAta');
        expect(client.program.token).toHaveProperty('createAtaAsync');
        expect(client.program.token).toHaveProperty('mintTo');
        expect(client.program.token).toHaveProperty('burn');
        expect(client.program.token).toHaveProperty('initializeMint');
    });

    it('preserves existing client properties', async () => {
        const payer = await generateKeyPairSigner();

        const client = createEmptyClient()
            .use(() => ({ payer, existingProp: 'test' }))
            .use(tokenProgramPlugin());

        expect(client).toHaveProperty('existingProp', 'test');
        expect(client).toHaveProperty('payer');
    });

    it('merges with existing program namespace', async () => {
        const payer = await generateKeyPairSigner();

        const client = createEmptyClient()
            .use(() => ({ payer, program: { system: { fake: true } } }))
            .use(tokenProgramPlugin());

        expect(client.program).toHaveProperty('system');
        expect(client.program).toHaveProperty('token');
        expect((client.program as Record<string, unknown>).system).toEqual({ fake: true });
    });
});

describe('resolveSigner', () => {
    it('returns override signer when provided', async () => {
        const payer = await generateKeyPairSigner();
        const override = await generateKeyPairSigner();

        const resolved = resolveSigner({ payer }, override);

        expect(resolved).toBe(override);
    });

    it('returns wallet signer when connected', async () => {
        const walletSigner = await generateKeyPairSigner();
        const wallet = createMockWallet(true, walletSigner);

        const resolved = resolveSigner({ wallet });

        expect(resolved).toBe(walletSigner);
    });

    it('returns payer when no wallet connected', async () => {
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
});

describe('token program instructions', () => {
    it('transfer returns an instruction', () => {
        const ns = createTokenProgramNamespace({});
        const ix = ns.transfer({ source: ADDR_1, destination: ADDR_2, authority: ADDR_3, amount: 1000n });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
        expect(ix).toHaveProperty('data');
    });

    it('transferChecked returns an instruction', () => {
        const ns = createTokenProgramNamespace({});
        const ix = ns.transferChecked({
            source: ADDR_1,
            destination: ADDR_2,
            mint: ADDR_3,
            authority: ADDR_4,
            amount: 1000n,
            decimals: 9,
        });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
        expect(ix).toHaveProperty('data');
    });

    it('createAta returns an instruction', async () => {
        const payer = await generateKeyPairSigner();

        const ns = createTokenProgramNamespace({});
        const ix = ns.createAta({ payer, ata: ADDR_1, owner: ADDR_2, mint: ADDR_3 });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });

    it('createAtaAsync resolves payer from client when not provided', async () => {
        const payer = await generateKeyPairSigner();

        const ns = createTokenProgramNamespace({ payer });
        const ix = await ns.createAtaAsync({ owner: ADDR_2, mint: ADDR_3 });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });

    it('createAtaAsync uses explicit payer when provided', async () => {
        const explicitPayer = await generateKeyPairSigner();

        const ns = createTokenProgramNamespace({});
        const ix = await ns.createAtaAsync({ payer: explicitPayer, owner: ADDR_2, mint: ADDR_3 });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });

    it('mintTo returns an instruction', () => {
        const ns = createTokenProgramNamespace({});
        const ix = ns.mintTo({ mint: ADDR_1, token: ADDR_2, mintAuthority: ADDR_3, amount: 1_000_000n });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
        expect(ix).toHaveProperty('data');
    });

    it('burn returns an instruction', () => {
        const ns = createTokenProgramNamespace({});
        const ix = ns.burn({ account: ADDR_1, mint: ADDR_2, authority: ADDR_3, amount: 500n });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
        expect(ix).toHaveProperty('data');
    });

    it('initializeMint returns an instruction', () => {
        const ns = createTokenProgramNamespace({});
        const ix = ns.initializeMint({ mint: ADDR_1, decimals: 9, mintAuthority: ADDR_2 });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
        expect(ix).toHaveProperty('data');
    });

    it('initializeMint accepts freezeAuthority', () => {
        const ns = createTokenProgramNamespace({});
        const ix = ns.initializeMint({ mint: ADDR_1, decimals: 6, mintAuthority: ADDR_2, freezeAuthority: ADDR_3 });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
        expect(ix).toHaveProperty('data');
    });

    it('transfer works with TransactionSigner as authority', async () => {
        const authority = await generateKeyPairSigner();

        const ns = createTokenProgramNamespace({});
        const ix = ns.transfer({ source: ADDR_1, destination: ADDR_2, authority, amount: 100n });

        expect(ix).toHaveProperty('programAddress');
        expect(ix).toHaveProperty('accounts');
    });
});

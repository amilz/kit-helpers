import { address, createEmptyClient, type Address } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import {
    assetPlugin,
    createAssetNamespace,
    MAINNET_ASSETS,
    MAINNET_TOKEN_MINTS,
    PROGRAM_IDS,
} from '../src';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('assetPlugin', () => {
    it('adds asset namespace to client', () => {
        const client = createEmptyClient().use(assetPlugin());

        expect(client).toHaveProperty('asset');
        expect(client.asset).toHaveProperty('usdc');
        expect(client.asset).toHaveProperty('systemProgram');
        expect(client.asset).toHaveProperty('resolve');
    });

    it('preserves existing client properties', () => {
        const client = createEmptyClient()
            .use(() => ({ existingProp: 'test' }))
            .use(assetPlugin());

        expect(client).toHaveProperty('existingProp', 'test');
        expect(client).toHaveProperty('asset');
    });

    it('includes custom assets', () => {
        const myToken = address('CuSTomTokenAddress1111111111111111111111111');

        const client = createEmptyClient().use(
            assetPlugin({
                custom: { myToken },
            }),
        );

        expect(client.asset.myToken).toBe(myToken);
        expect(client.asset.usdc).toBe(MAINNET_TOKEN_MINTS.usdc);
    });
});

describe('asset addresses', () => {
    it('returns typed Address values for tokens', () => {
        const ns = createAssetNamespace();

        const usdc: Address = ns.usdc;
        const wsol: Address = ns.wsol;

        expect(usdc).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        expect(wsol).toBe('So11111111111111111111111111111111111111112');
    });

    it('returns typed Address values for programs', () => {
        const ns = createAssetNamespace();

        const system: Address = ns.systemProgram;
        const token: Address = ns.tokenProgram;

        expect(system).toBe('11111111111111111111111111111111');
        expect(token).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    });

    it('all built-in assets are valid base58 addresses', () => {
        for (const [, addr] of Object.entries(MAINNET_ASSETS)) {
            expect(typeof addr).toBe('string');
            expect(addr.length).toBeGreaterThan(0);
            expect(addr.length).toBeLessThanOrEqual(44);
        }
    });
});

describe('resolve', () => {
    it('resolves known asset by name', () => {
        const ns = createAssetNamespace();

        expect(ns.resolve('usdc')).toBe(MAINNET_TOKEN_MINTS.usdc);
        expect(ns.resolve('systemProgram')).toBe(PROGRAM_IDS.systemProgram);
    });

    it('resolves custom asset by name', () => {
        const myToken = address('CuSTomTokenAddress1111111111111111111111111');
        const ns = createAssetNamespace({ custom: { myToken } });

        expect(ns.resolve('myToken')).toBe(myToken);
    });

    it('throws for unknown asset', () => {
        const ns = createAssetNamespace();

        expect(() => ns.resolve('nonexistent')).toThrow('Unknown asset: "nonexistent"');
    });
});

describe('type compatibility', () => {
    it('asset addresses satisfy Address parameter types', () => {
        const ns = createAssetNamespace();

        // Simulates passing to an instruction helper that accepts Address
        function acceptsAddress(_addr: Address): boolean {
            return true;
        }

        expect(acceptsAddress(ns.usdc)).toBe(true);
        expect(acceptsAddress(ns.systemProgram)).toBe(true);
        expect(acceptsAddress(ns.tokenProgram)).toBe(true);
    });
});

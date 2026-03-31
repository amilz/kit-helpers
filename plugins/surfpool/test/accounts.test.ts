import { beforeAll, describe, expect, test } from 'vitest';
import { address, lamports } from '@solana/kit';

import { testClient } from './helpers/client';
import { assertNullResponse } from './helpers/assertions';

const { rpc, surfnet } = testClient;

// A burn address we can safely mutate in tests
const TEST_PUBKEY = address('1nc1nerator11111111111111111111111111111111');

describe('Account manipulation', () => {
    describe('surfnet_setAccount', () => {
        test('sets lamports on an account', async () => {
            const result = await surfnet.setAccount(TEST_PUBKEY, { lamports: 5_000_000_000 }).send();
            assertNullResponse(result);
        });

        test('getBalance reflects new lamports', async () => {
            await surfnet.setAccount(TEST_PUBKEY, { lamports: 3_000_000_000 }).send();
            const { value: balance } = await rpc.getBalance(TEST_PUBKEY).send();
            expect(balance).toBe(lamports(3_000_000_000n));
        });

        test('sets data on an account', async () => {
            const result = await surfnet
                .setAccount(TEST_PUBKEY, {
                    lamports: 1_000_000_000,
                    data: 'deadbeef',
                })
                .send();
            assertNullResponse(result);
        });
    });

    describe('surfnet_resetAccount', () => {
        beforeAll(async () => {
            await surfnet.setAccount(TEST_PUBKEY, { lamports: 5_000_000_000 }).send();
        });

        test('resets account state', async () => {
            const result = await surfnet.resetAccount(TEST_PUBKEY).send();
            assertNullResponse(result);
        });
    });

    describe('surfnet_setTokenAccount', () => {
        const USDC_MINT = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const TOKEN_OWNER = address('11111111111111111111111111111111');

        test('sets a token account balance', async () => {
            const result = await surfnet
                .setTokenAccount(TOKEN_OWNER, USDC_MINT, {
                    amount: 1_000_000,
                })
                .send();
            assertNullResponse(result);
        });
    });

    describe('surfnet_streamAccount / surfnet_getStreamedAccounts', () => {
        test('registers an account for streaming', async () => {
            const result = await surfnet.streamAccount(TEST_PUBKEY).send();
            assertNullResponse(result);
        });

        test('getStreamedAccounts returns registered accounts', async () => {
            await surfnet.streamAccount(TEST_PUBKEY).send();
            const result = await surfnet.getStreamedAccounts().send();
            expect(Array.isArray(result.accounts)).toBe(true);
        });
    });
});

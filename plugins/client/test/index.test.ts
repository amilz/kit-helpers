import type { ClusterUrl } from '@solana/kit';
import { generateKeyPairSigner } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { createSolanaClient } from '../src';

const URL = 'https://api.devnet.solana.com' as ClusterUrl;

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

        // Action namespace
        expect(client.action).toHaveProperty('send');
        expect(client.action).toHaveProperty('simulate');
        expect(client.action).toHaveProperty('sign');

        // Program namespaces
        expect(client.program).toHaveProperty('system');
        expect(client.program).toHaveProperty('token');

        // System program methods
        expect(client.program.system).toHaveProperty('transfer');
        expect(client.program.system).toHaveProperty('createAccount');
        expect(client.program.system).toHaveProperty('allocate');
        expect(client.program.system).toHaveProperty('assign');

        // Token program methods
        expect(client.program.token).toHaveProperty('transfer');
        expect(client.program.token).toHaveProperty('transferChecked');
        expect(client.program.token).toHaveProperty('createAta');
        expect(client.program.token).toHaveProperty('createAtaAsync');
        expect(client.program.token).toHaveProperty('mintTo');
        expect(client.program.token).toHaveProperty('burn');
        expect(client.program.token).toHaveProperty('initializeMint');
    });

    it('creates client with wallet', () => {
        const mockConnector = {
            canAutoConnect: false,
            connect: async () => ({}) as never,
            disconnect: async () => {},
            icon: 'data:image/svg+xml,',
            id: 'mock',
            isSupported: () => true,
            kind: 'mock',
            name: 'Mock Wallet',
            ready: true,
        };

        const client = createSolanaClient({
            url: URL,
            wallet: { connectors: [mockConnector] },
        });

        expect(client).toHaveProperty('wallet');
        expect(client.wallet).toHaveProperty('connect');
        expect(client.wallet).toHaveProperty('disconnect');
        expect(client.wallet).toHaveProperty('connected');
        expect(client.wallet).toHaveProperty('connectors');
        expect(client).not.toHaveProperty('payer');
    });

    it('rejects passing both payer and wallet at the type level', async () => {
        const kp = await generateKeyPairSigner();
        const mockConnector = {
            canAutoConnect: false,
            connect: async () => ({}) as never,
            disconnect: async () => {},
            icon: 'data:image/svg+xml,',
            id: 'mock',
            isSupported: () => true,
            kind: 'mock',
            name: 'Mock Wallet',
            ready: true,
        };

        // @ts-expect-error — payer and wallet are mutually exclusive
        createSolanaClient({
            payer: kp,
            url: URL,
            wallet: { connectors: [mockConnector] },
        });
    });

    it('passes action options through', async () => {
        const kp = await generateKeyPairSigner();
        const client = createSolanaClient({
            action: { commitment: 'finalized' },
            payer: kp,
            url: URL,
        });

        expect(client.action).toHaveProperty('send');
    });
});

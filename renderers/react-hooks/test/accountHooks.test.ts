import {
    accountNode,
    constantPdaSeedNodeFromString,
    numberTypeNode,
    pdaLinkNode,
    pdaNode,
    programNode,
    publicKeyTypeNode,
    rootNode,
    structFieldTypeNode,
    structTypeNode,
    variablePdaSeedNode,
} from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains, renderMapContainsImports } from './_setup';

test('it generates a basic account hook with subscription and decoder', async () => {
    // Given a program with a simple account.
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([structFieldTypeNode({ name: 'value', type: numberTypeNode('u64') })]),
                name: 'counter',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    // When we render it.
    const renderMap = visit(node, getRenderMapVisitor());

    // Then we expect a hook file with the subscription pattern.
    await renderMapContains(renderMap, 'hooks/counter.ts', [
        'export function useCounter(address: Address',
        'useCounterConfig',
        'useState<Counter | null>(null)',
        'getCounterDecoder()',
        'accountNotifications(address',
        'decoder.decode(rawData)',
        'return { data, error, status }',
    ]);
});

test('it generates correct imports for account hooks', async () => {
    // Given a program with an account.
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([]),
                name: 'token',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    // Then we expect react, kit, and client imports.
    await renderMapContainsImports(renderMap, 'hooks/token.ts', {
        react: ['useEffect', 'useMemo', 'useState'],
    });
});

test('it generates FromSeeds variant for accounts with PDA link', async () => {
    // Given a program with an account linked to a PDA with variable seeds.
    const node = programNode({
        accounts: [accountNode({ data: structTypeNode([]), name: 'metadata', pda: pdaLinkNode('metadataPda') })],
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'metadataPda',
                seeds: [
                    constantPdaSeedNodeFromString('utf8', 'metadata'),
                    variablePdaSeedNode('mint', publicKeyTypeNode()),
                ],
            }),
        ],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    // Then we expect both the base hook and the FromSeeds variant.
    await renderMapContains(renderMap, 'hooks/metadata.ts', [
        'export function useMetadata(address: Address',
        'export function useMetadataFromSeeds(',
        'MetadataPdaSeeds',
        'findMetadataPdaPda(',
        'setAddress(pda)',
    ]);
});

test('it generates FromSeeds without seeds param for PDA with no variable seeds', async () => {
    // Given a program with an account linked to a PDA with only constant seeds.
    const node = programNode({
        accounts: [accountNode({ data: structTypeNode([]), name: 'config', pda: pdaLinkNode('configPda') })],
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'configPda',
                seeds: [constantPdaSeedNodeFromString('utf8', 'config')],
            }),
        ],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    // Then the FromSeeds hook should not have a seeds parameter.
    await renderMapContains(renderMap, 'hooks/config.ts', [
        'export function useConfigFromSeeds(config: useConfigFromSeedsConfig)',
        'findConfigPdaPda({ programAddress',
    ]);
});

test('it does not generate FromSeeds for accounts without PDA', async () => {
    // Given a program with an account that has no PDA link.
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([]),
                name: 'wallet',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    // Then we should only have the base hook, not FromSeeds.
    await renderMapContains(renderMap, 'hooks/wallet.ts', ['export function useWallet(address: Address']);
});

test('it generates batch account hook with stable deps and empty guard', async () => {
    // Given a program with an account.
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([structFieldTypeNode({ name: 'value', type: numberTypeNode('u64') })]),
                name: 'counter',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    // Then the batch hook should have proper content.
    await renderMapContains(renderMap, 'hooks/counter.ts', [
        'export function useCounters(addresses: Address[]',
        'getMultipleAccounts',
        'if (addresses.length === 0)',
    ]);
});

test('it generates use client directive in pages', async () => {
    // Given a program with an account.
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([]),
                name: 'token',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    // Then the generated page should include the use client directive.
    await renderMapContains(renderMap, 'hooks/token.ts', ["'use client'"]);
});

test('it generates hooks/index.ts barrel export', async () => {
    // Given a root with a program with multiple accounts.
    const node = rootNode(
        programNode({
            accounts: [
                accountNode({ data: structTypeNode([]), name: 'alpha' }),
                accountNode({ data: structTypeNode([]), name: 'beta' }),
            ],
            name: 'myProgram',
            publicKey: '1111',
        }),
    );

    const renderMap = visit(node, getRenderMapVisitor());

    // Then we expect a barrel index that exports both.
    await renderMapContains(renderMap, 'hooks/index.ts', ["export * from './alpha'", "export * from './beta'"]);
});

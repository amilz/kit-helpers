import {
    constantPdaSeedNodeFromString,
    pdaNode,
    programNode,
    publicKeyTypeNode,
    variablePdaSeedNode,
} from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains } from './_setup';

test('it generates a PDA hook with variable seeds', async () => {
    const node = programNode({
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'tokenMetadata',
                seeds: [
                    constantPdaSeedNodeFromString('utf8', 'metadata'),
                    variablePdaSeedNode('mint', publicKeyTypeNode()),
                ],
            }),
        ],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/pdas/tokenMetadata.ts', [
        'export function useTokenMetadataAddress(',
        'TokenMetadataSeeds',
        'findTokenMetadataPda(',
        'setAddress(pda)',
        'return { address, error, status }',
    ]);
});

test('it generates a PDA hook without seeds param when no variable seeds', async () => {
    const node = programNode({
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'globalConfig',
                seeds: [constantPdaSeedNodeFromString('utf8', 'config')],
            }),
        ],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/pdas/globalConfig.ts', [
        'export function useGlobalConfigAddress(',
        'findGlobalConfigPda(',
    ]);
});

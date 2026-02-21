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

test('it generates PDA doc with variable seeds', () => {
    const node = programNode({
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'counter',
                seeds: [
                    constantPdaSeedNodeFromString('utf8', 'counter'),
                    variablePdaSeedNode('authority', publicKeyTypeNode()),
                ],
            }),
        ],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'pdas/counter.md', [
        '# Counter',
        '## Seeds',
        '| Seed | Type | Kind |',
        '`authority`',
        '`Address`',
        'variable',
        'constant',
        '## Find PDA',
        'findCounterPda({ authority })',
    ]);
});

test('it generates PDA doc with only constant seeds', () => {
    const node = programNode({
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'config',
                seeds: [constantPdaSeedNodeFromString('utf8', 'config')],
            }),
        ],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'pdas/config.md', ['# Config', '## Find PDA', 'findConfigPda({})']);
});

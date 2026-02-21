import { accountNode, pdaNode, programNode, structTypeNode } from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { expect, test } from 'vitest';

import { getRenderMapVisitor } from '../src';

test('it creates a render map from a minimal program node', () => {
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([]),
                name: 'myAccount',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    expect(renderMap).toBeDefined();
});

test('it creates a render map from a program with PDAs', () => {
    const node = programNode({
        accounts: [],
        name: 'myProgram',
        pdas: [pdaNode({ name: 'myPda', seeds: [] })],
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    expect(renderMap).toBeDefined();
});

test('it accepts custom options', () => {
    const node = programNode({
        accounts: [],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(
        node,
        getRenderMapVisitor({
            packageName: '@my/program-docs',
        }),
    );

    expect(renderMap).toBeDefined();
});

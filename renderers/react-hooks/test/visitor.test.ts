import { accountNode, pdaNode, programNode, structTypeNode } from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { expect, test } from 'vitest';

import { getRenderMapVisitor } from '../src';

test('it creates a render map from a minimal program node', () => {
    // Given a minimal program with one account.
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

    // When we visit it with the render map visitor.
    const renderMap = visit(node, getRenderMapVisitor());

    // Then the render map is created without errors.
    expect(renderMap).toBeDefined();
});

test('it creates a render map from a program with PDAs', () => {
    // Given a program with a PDA.
    const node = programNode({
        accounts: [],
        name: 'myProgram',
        pdas: [pdaNode({ name: 'myPda', seeds: [] })],
        publicKey: '1111',
    });

    // When we visit it.
    const renderMap = visit(node, getRenderMapVisitor());

    // Then the render map is created without errors.
    expect(renderMap).toBeDefined();
});

test('it accepts custom options', () => {
    // Given a minimal program.
    const node = programNode({
        accounts: [],
        name: 'myProgram',
        publicKey: '1111',
    });

    // When we visit it with custom options.
    const renderMap = visit(
        node,
        getRenderMapVisitor({
            clientPackage: '@my/generated-client',
            kitImportStrategy: 'granular',
        }),
    );

    // Then the render map is created without errors.
    expect(renderMap).toBeDefined();
});

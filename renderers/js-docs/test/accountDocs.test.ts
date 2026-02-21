import {
    accountNode,
    fieldDiscriminatorNode,
    numberTypeNode,
    programNode,
    publicKeyTypeNode,
    structFieldTypeNode,
    structTypeNode,
} from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains } from './_setup';

test('it generates account doc with fields table and fetch examples', () => {
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([
                    structFieldTypeNode({ name: 'count', type: numberTypeNode('u64') }),
                    structFieldTypeNode({ name: 'authority', type: publicKeyTypeNode() }),
                ]),
                name: 'counter',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'accounts/counter.md', [
        '# Counter',
        '## Fields',
        '| Field | Type |',
        '`count`',
        '`bigint`',
        '`authority`',
        '`Address`',
        '## Fetch',
        'fetchCounter(rpc, address)',
        '## Fetch (Maybe)',
        'fetchMaybeCounter(rpc, address)',
        '## Decode',
        'decodeCounter(encodedAccount)',
        '## Fetch All',
        'fetchAllCounter(rpc, addresses)',
        '## Import',
        "from 'my-program-client'",
    ]);
});

test('it generates account doc with discriminator section', () => {
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([structFieldTypeNode({ name: 'value', type: numberTypeNode('u32') })]),
                discriminators: [fieldDiscriminatorNode('discriminator', 0)],
                name: 'myAccount',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'accounts/myAccount.md', ['## Discriminator', '`discriminator`']);
});

test('it generates account doc with correct size for fixed-size accounts', () => {
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([structFieldTypeNode({ name: 'value', type: numberTypeNode('u64') })]),
                name: 'simple',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'accounts/simple.md', ['8 bytes']);
});

test('it uses custom package name in import examples', () => {
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

    const renderMap = visit(node, getRenderMapVisitor({ packageName: '@my/custom-client' }));

    renderMapContains(renderMap, 'accounts/myAccount.md', ["from '@my/custom-client'"]);
});

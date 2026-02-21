import {
    definedTypeNode,
    enumEmptyVariantTypeNode,
    enumStructVariantTypeNode,
    enumTypeNode,
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

test('it generates struct type doc with fields table and codec', () => {
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'transferArgs',
                type: structTypeNode([
                    structFieldTypeNode({ name: 'amount', type: numberTypeNode('u64') }),
                    structFieldTypeNode({ name: 'destination', type: publicKeyTypeNode() }),
                ]),
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'types/transferArgs.md', [
        '# TransferArgs',
        '## Fields',
        '`amount`',
        '`bigint`',
        '`destination`',
        '`Address`',
        '## Codec',
        'getTransferArgsEncoder()',
        'getTransferArgsDecoder()',
        '## Import',
        "from 'my-program-client'",
    ]);
});

test('it generates scalar enum type doc with variants table', () => {
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'tokenState',
                type: enumTypeNode([
                    enumEmptyVariantTypeNode('uninitialized'),
                    enumEmptyVariantTypeNode('initialized'),
                    enumEmptyVariantTypeNode('frozen'),
                ]),
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'types/tokenState.md', [
        '# TokenState',
        '## Variants',
        '`uninitialized`',
        '`initialized`',
        '`frozen`',
        '| Variant | Discriminator |',
    ]);
});

test('it generates non-scalar enum type doc with variant descriptions', () => {
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'action',
                type: enumTypeNode([
                    enumEmptyVariantTypeNode('close'),
                    enumStructVariantTypeNode(
                        'transfer',
                        structTypeNode([structFieldTypeNode({ name: 'amount', type: numberTypeNode('u64') })]),
                    ),
                ]),
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'types/action.md', ['# Action', '## Variants', '`close`', '`transfer`']);
});

test('it generates simple type alias doc', () => {
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'amount',
                type: numberTypeNode('u64'),
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'types/amount.md', ['# Amount', '## Type', '`bigint`', '## Codec']);
});

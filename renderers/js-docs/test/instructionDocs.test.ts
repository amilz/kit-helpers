import {
    instructionAccountNode,
    instructionArgumentNode,
    instructionNode,
    numberTypeNode,
    programNode,
    publicKeyTypeNode,
} from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains } from './_setup';

test('it generates instruction doc with accounts table', () => {
    const node = programNode({
        instructions: [
            instructionNode({
                accounts: [
                    instructionAccountNode({ isSigner: false, isWritable: true, name: 'source' }),
                    instructionAccountNode({ isSigner: false, isWritable: true, name: 'destination' }),
                    instructionAccountNode({ isSigner: true, isWritable: false, name: 'authority' }),
                ],
                arguments: [],
                name: 'transfer',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'instructions/transfer.md', [
        '# Transfer',
        '## Accounts',
        '| Account | Signer | Writable | Optional |',
        '`source`',
        '`authority`',
        '✅',
    ]);
});

test('it generates instruction doc with args table', () => {
    const node = programNode({
        instructions: [
            instructionNode({
                accounts: [],
                arguments: [
                    instructionArgumentNode({ name: 'amount', type: numberTypeNode('u64') }),
                    instructionArgumentNode({ name: 'destination', type: publicKeyTypeNode() }),
                ],
                name: 'transfer',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'instructions/transfer.md', [
        '## Arguments',
        '| Argument | Type |',
        '`amount`',
        '`bigint`',
        '`destination`',
        '`Address`',
    ]);
});

test('it generates instruction doc with build and send examples', () => {
    const node = programNode({
        instructions: [
            instructionNode({
                accounts: [instructionAccountNode({ isSigner: true, isWritable: false, name: 'authority' })],
                arguments: [instructionArgumentNode({ name: 'amount', type: numberTypeNode('u64') })],
                name: 'transfer',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'instructions/transfer.md', [
        '## Build',
        'getTransferInstruction({',
        'authority: signer',
        'amount: value',
        '## Send',
        'createTransactionMessage',
        'signAndSendTransactionMessageWithSigners',
    ]);
});

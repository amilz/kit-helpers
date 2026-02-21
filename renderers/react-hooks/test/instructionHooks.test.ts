import { instructionAccountNode, instructionNode, programNode } from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains, renderMapContainsImports } from './_setup';

test('it generates an instruction hook with send function', async () => {
    const node = programNode({
        instructions: [
            instructionNode({
                accounts: [instructionAccountNode({ isSigner: true, isWritable: true, name: 'payer' })],
                name: 'initialize',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/instructions/initialize.ts', [
        'export function useInitialize(config: useInitializeConfig)',
        'send',
        'useCallback',
        'getInitializeInstruction(input)',
        'createTransactionMessage',
        'sendAndConfirmTransactionFactory',
        'return { error, send, signature, status }',
    ]);
});

test('it generates correct imports for instruction hooks', async () => {
    const node = programNode({
        instructions: [instructionNode({ name: 'transfer' })],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContainsImports(renderMap, 'hooks/instructions/transfer.ts', {
        react: ['useCallback', 'useState'],
    });
});

test('it generates instruction hooks with correct status lifecycle', async () => {
    const node = programNode({
        instructions: [instructionNode({ name: 'mint' })],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/instructions/mint.ts', [
        "'idle'",
        "'sending'",
        "'confirming'",
        "'success'",
        "'error'",
        'TransactionSigner',
        'Signature',
    ]);
});

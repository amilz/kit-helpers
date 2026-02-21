import { errorNode, programNode } from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains } from './_setup';

test('it generates a program hook with address', async () => {
    const node = programNode({
        name: 'tokenProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/programs/tokenProgram.ts', [
        'export function useProgramTokenProgram(',
        'TOKEN_PROGRAM_PROGRAM_ADDRESS',
        'return { programAddress',
    ]);
});

test('it generates a program hook with error decoder when errors exist', async () => {
    const node = programNode({
        errors: [
            errorNode({ code: 0, message: 'Invalid account', name: 'invalidAccount' }),
            errorNode({ code: 1, message: 'Insufficient funds', name: 'insufficientFunds' }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/programs/myProgram.ts', [
        'decodeError',
        'isMyProgramError',
        'getMyProgramErrorMessage',
    ]);
});

test('it generates a program hook without error decoder when no errors', async () => {
    const node = programNode({
        name: 'simpleProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    await renderMapContains(renderMap, 'hooks/programs/simpleProgram.ts', ['return { programAddress }']);
});

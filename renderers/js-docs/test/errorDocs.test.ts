import { errorNode, programNode } from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains, renderMapMissing } from './_setup';

test('it generates errors page with error table and check example', () => {
    const node = programNode({
        errors: [
            errorNode({
                code: 0,
                docs: ['Account not initialized'],
                message: 'Account not initialized',
                name: 'notInitialized',
            }),
            errorNode({
                code: 1,
                docs: ['Insufficient funds'],
                message: 'Insufficient funds',
                name: 'insufficientFunds',
            }),
        ],
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapContains(renderMap, 'errors.md', [
        '# MyProgram Errors',
        '| Code | Name | Message |',
        '0x0 (0)',
        '`notInitialized`',
        '0x1 (1)',
        '`insufficientFunds`',
        '## Check Error',
        'isMyProgramError(error',
        'getMyProgramErrorMessage(',
    ]);
});

test('it does not generate errors page when program has no errors', () => {
    const node = programNode({
        name: 'myProgram',
        publicKey: '1111',
    });

    const renderMap = visit(node, getRenderMapVisitor());

    renderMapMissing(renderMap, 'errors.md');
});

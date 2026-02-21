import {
    accountNode,
    errorNode,
    instructionAccountNode,
    instructionNode,
    numberTypeNode,
    pdaNode,
    programNode,
    publicKeyTypeNode,
    structFieldTypeNode,
    structTypeNode,
    variablePdaSeedNode,
} from '@codama/nodes';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { getRenderMapVisitor } from '../src';
import { renderMapContains } from './_setup';

test('it generates program overview with all sections', () => {
    const node = programNode({
        accounts: [
            accountNode({
                data: structTypeNode([structFieldTypeNode({ name: 'count', type: numberTypeNode('u64') })]),
                name: 'counter',
            }),
        ],
        definedTypes: [],
        errors: [
            errorNode({ code: 0, docs: ['Account not found.'], message: 'AccountNotFound', name: 'accountNotFound' }),
        ],
        instructions: [
            instructionNode({
                accounts: [instructionAccountNode({ isSigner: true, isWritable: false, name: 'authority' })],
                name: 'increment',
            }),
        ],
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'counterPda',
                seeds: [variablePdaSeedNode('owner', publicKeyTypeNode())],
            }),
        ],
        publicKey: '1111',
    });
    const renderMap = visit(node, getRenderMapVisitor());
    renderMapContains(renderMap, 'index.md', ['# My Program', 'MY_PROGRAM_PROGRAM_ADDRESS', '## Installation']);
    renderMapContains(renderMap, 'index.md', ['## Accounts', 'Counter', 'accounts/counter.md']);
    renderMapContains(renderMap, 'index.md', ['## Instructions', 'Increment', 'instructions/increment.md']);
    renderMapContains(renderMap, 'index.md', ['## PDAs', 'CounterPda', 'pdas/counterPda.md']);
    renderMapContains(renderMap, 'index.md', ['## Errors', 'errors.md']);
});

test('it omits empty sections', () => {
    const node = programNode({
        accounts: [],
        definedTypes: [],
        errors: [],
        instructions: [],
        name: 'emptyProgram',
        pdas: [],
        publicKey: '2222',
    });
    const renderMap = visit(node, getRenderMapVisitor());
    renderMapContains(renderMap, 'index.md', ['# Empty Program', '## Installation']);
});

test('it uses custom package name in install section', () => {
    const node = programNode({
        name: 'myProgram',
        publicKey: '3333',
    });
    const renderMap = visit(node, getRenderMapVisitor({ packageName: '@example/my-client' }));
    renderMapContains(renderMap, 'index.md', ['npm install @example/my-client']);
});

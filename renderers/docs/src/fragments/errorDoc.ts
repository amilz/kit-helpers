import { pascalCase, ProgramNode } from '@codama/nodes';

import {
    type DocsRenderScope,
    type Fragment,
    fragment,
    mdCodeBlock,
    mdHeading,
    mdTable,
    mergeFragments,
} from '../utils';

export function getErrorDocFragment(input: { programNode: ProgramNode; scope: DocsRenderScope }): Fragment | undefined {
    const { programNode, scope } = input;
    const { nameApi, packageName } = scope;
    const errors = programNode.errors ?? [];

    if (errors.length === 0) return undefined;

    const programName = pascalCase(programNode.name);

    const titleFragment = fragment`${mdHeading(`${programName} Errors`, 1)}`;

    // Errors table.
    const tableFragment = fragment`${mdTable(
        ['Code', 'Name', 'Message'],
        errors.map(e => {
            const code = e.code;
            const hexCode = `0x${code.toString(16)}`;
            return [`${hexCode} (${code})`, `\`${e.name}\``, (e.docs ?? []).join(' ') || e.message];
        }),
    )}`;

    // Error checking example.
    const isErrorFn = nameApi.programIsErrorFunction(programNode.name);
    const getMessageFn = nameApi.programGetErrorMessageFunction(programNode.name);
    const exampleFragment = mergeFragments(
        [
            fragment`${mdHeading('Check Error', 2)}`,
            fragment`${mdCodeBlock(`import { ${isErrorFn}, ${getMessageFn} } from '${packageName}';\n\nif (${isErrorFn}(error, transactionMessage)) {\n  const message = ${getMessageFn}(error.context.code);\n}`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Import hint.
    const importFragment = mergeFragments(
        [
            fragment`${mdHeading('Import', 2)}`,
            fragment`${mdCodeBlock(`import { ${isErrorFn}, ${getMessageFn} } from '${packageName}';`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    return mergeFragments([titleFragment, importFragment, tableFragment, exampleFragment], cs => cs.join('\n\n'));
}

import { InstructionNode, isNode, pascalCase } from '@codama/nodes';
import { visit } from '@codama/visitors-core';

import {
    type DocsRenderScope,
    type Fragment,
    fragment,
    getTypeStringVisitor,
    mdCodeBlock,
    mdHeading,
    mdTable,
    mergeFragments,
} from '../utils';

export function getInstructionDocFragment(input: {
    instructionNode: InstructionNode;
    scope: DocsRenderScope;
}): Fragment {
    const { instructionNode, scope } = input;
    const { nameApi, packageName } = scope;
    const name = pascalCase(instructionNode.name);
    const typeStringVisitor = getTypeStringVisitor();
    const docs = instructionNode.docs ?? [];

    const titleFragment = fragment`${mdHeading(name, 1)}`;
    const docsFragment = docs.length > 0 ? fragment`${docs.join('\n')}` : undefined;

    // Accounts table.
    const accounts = instructionNode.accounts ?? [];
    const accountsFragment =
        accounts.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Accounts', 2)}`,
                      fragment`${mdTable(
                          ['Account', 'Signer', 'Writable', 'Optional'],
                          accounts.map(a => [
                              `\`${a.name}\``,
                              a.isSigner === true || a.isSigner === 'either' ? '✅' : '',
                              a.isWritable ? '✅' : '',
                              a.isOptional ? '✅' : '',
                          ]),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // Arguments table.
    const args = (instructionNode.arguments ?? []).filter(
        a => !(a.defaultValue && isNode(a.defaultValue, 'resolverValueNode')),
    );
    const argsFragment =
        args.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Arguments', 2)}`,
                      fragment`${mdTable(
                          ['Argument', 'Type'],
                          args.map(a => {
                              const typeStr: string = visit(a.type, typeStringVisitor);
                              return [`\`${a.name}\``, `\`${typeStr}\``];
                          }),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // Build instruction example.
    const syncFn = nameApi.instructionSyncFunction(instructionNode.name);
    const accountParams = accounts.map(a => `  ${a.name}: ${a.isSigner === true ? 'signer' : `address('...')`}`);
    const argParams = args.map(a => `  ${a.name}: value`);
    const allParams = [...accountParams, ...argParams].join(',\n');
    const buildFragment = mergeFragments(
        [
            fragment`${mdHeading('Build', 2)}`,
            fragment`${mdCodeBlock(`const instruction = ${syncFn}({\n${allParams}\n});`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Send example.
    const sendFragment = mergeFragments(
        [
            fragment`${mdHeading('Send', 2)}`,
            fragment`${mdCodeBlock(
                `import { pipe } from '@solana/kit';\n` +
                    `import { ${syncFn} } from '${packageName}';\n\n` +
                    `const instruction = ${syncFn}({ /* ... */ });\n` +
                    `await pipe(\n  createTransactionMessage({ version: 0 }),\n  tx => setTransactionMessageFeePayer(feePayer, tx),\n  tx => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),\n  tx => appendTransactionMessageInstruction(instruction, tx),\n  tx => signAndSendTransactionMessageWithSigners(tx),\n);`,
            )}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Import hint.
    const importFragment = mergeFragments(
        [fragment`${mdHeading('Import', 2)}`, fragment`${mdCodeBlock(`import { ${syncFn} } from '${packageName}';`)}`],
        cs => cs.join('\n\n'),
    );

    // Discriminator.
    const discriminators = instructionNode.discriminators ?? [];
    const discriminatorFragment =
        discriminators.length > 0
            ? fragment`${mdHeading('Discriminator', 2)}\n\n${mdTable(
                  ['Type', 'Value', 'Offset'],
                  discriminators.map(d => {
                      if (isNode(d, 'fieldDiscriminatorNode')) {
                          return ['field', `\`${d.name}\``, `${d.offset}`];
                      }
                      if (isNode(d, 'sizeDiscriminatorNode')) {
                          return ['size', `${d.size}`, '0'];
                      }
                      return ['constant', '-', `${isNode(d, 'constantDiscriminatorNode') ? d.offset : 0}`];
                  }),
              )}`
            : undefined;

    return mergeFragments(
        [
            titleFragment,
            docsFragment,
            importFragment,
            accountsFragment,
            argsFragment,
            buildFragment,
            sendFragment,
            discriminatorFragment,
        ],
        cs => cs.join('\n\n'),
    );
}

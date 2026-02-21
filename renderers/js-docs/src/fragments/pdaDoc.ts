import { isNode, pascalCase, PdaNode } from '@codama/nodes';
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

export function getPdaDocFragment(input: { pdaNode: PdaNode; scope: DocsRenderScope }): Fragment {
    const { pdaNode, scope } = input;
    const { nameApi, packageName } = scope;
    const name = pascalCase(pdaNode.name);
    const typeStringVisitor = getTypeStringVisitor();
    const docs = pdaNode.docs ?? [];

    const titleFragment = fragment`${mdHeading(name, 1)}`;
    const docsFragment = docs.length > 0 ? fragment`${docs.join('\n')}` : undefined;

    // Seeds table.
    const seeds = pdaNode.seeds ?? [];
    const seedsFragment =
        seeds.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Seeds', 2)}`,
                      fragment`${mdTable(
                          ['Seed', 'Type', 'Kind'],
                          seeds.map(s => {
                              if (isNode(s, 'variablePdaSeedNode')) {
                                  const typeStr: string = visit(s.type, typeStringVisitor);
                                  return [`\`${s.name}\``, `\`${typeStr}\``, 'variable'];
                              }
                              if (isNode(s, 'constantPdaSeedNode')) {
                                  return ['(constant)', '-', 'constant'];
                              }
                              return ['-', '-', '-'];
                          }),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // Find PDA example.
    const findFn = nameApi.pdaFindFunction(pdaNode.name);
    const variableSeeds = seeds.filter(s => isNode(s, 'variablePdaSeedNode'));
    const seedParams = variableSeeds.length > 0 ? `{ ${variableSeeds.map(s => s.name).join(', ')} }` : '{}';
    const findFragment = mergeFragments(
        [
            fragment`${mdHeading('Find PDA', 2)}`,
            fragment`${mdCodeBlock(`const [address] = await ${findFn}(${seedParams});`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Import hint.
    const importFragment = mergeFragments(
        [fragment`${mdHeading('Import', 2)}`, fragment`${mdCodeBlock(`import { ${findFn} } from '${packageName}';`)}`],
        cs => cs.join('\n\n'),
    );

    return mergeFragments([titleFragment, docsFragment, importFragment, seedsFragment, findFragment], cs =>
        cs.join('\n\n'),
    );
}

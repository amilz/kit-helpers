import {
    camelCase,
    getAllInstructionsWithSubs,
    pascalCase,
    ProgramNode,
    resolveNestedTypeNode,
    titleCase,
} from '@codama/nodes';
import { getByteSizeVisitor, LinkableDictionary, visit } from '@codama/visitors-core';

import {
    type DocsRenderScope,
    type Fragment,
    fragment,
    mdCodeBlock,
    mdHeading,
    mdLink,
    mdTable,
    mergeFragments,
} from '../utils';

export function getProgramOverviewFragment(input: { programNode: ProgramNode; scope: DocsRenderScope }): Fragment {
    const { programNode, scope } = input;
    const { nameApi, packageName } = scope;
    const name = titleCase(programNode.name);
    const docs = programNode.docs ?? [];

    // Title + program address.
    const addressConstant = nameApi.programAddressConstant(programNode.name);
    const titleFragment = fragment`${mdHeading(name, 1)}`;
    const addressFragment = fragment`Program address: \`${addressConstant}\``;
    const docsFragment = docs.length > 0 ? fragment`${docs.join('\n')}` : undefined;

    // Install.
    const installFragment = mergeFragments(
        [fragment`${mdHeading('Installation', 2)}`, fragment`${mdCodeBlock(`npm install ${packageName}`, 'bash')}`],
        cs => cs.join('\n\n'),
    );

    // Accounts summary.
    const accountsFragment =
        programNode.accounts.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Accounts', 2)}`,
                      fragment`${mdTable(
                          ['Account', 'Size'],
                          programNode.accounts.map(a => {
                              const link = mdLink(pascalCase(a.name), `accounts/${camelCase(a.name)}.md`);
                              let size: string;
                              try {
                                  const byteSize = visit(a.data, getByteSizeVisitor(new LinkableDictionary()));
                                  size = byteSize !== null ? `${byteSize} bytes` : 'Variable';
                              } catch {
                                  size = 'Variable';
                              }
                              return [link, size];
                          }),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // Instructions summary.
    const instructions = getAllInstructionsWithSubs(programNode, { leavesOnly: true });
    const instructionsFragment =
        instructions.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Instructions', 2)}`,
                      fragment`${mdTable(
                          ['Instruction', 'Description'],
                          instructions.map(i => {
                              const link = mdLink(pascalCase(i.name), `instructions/${camelCase(i.name)}.md`);
                              const desc = (i.docs ?? []).join(' ') || '-';
                              return [link, desc];
                          }),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // PDAs summary.
    const pdasFragment =
        programNode.pdas.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('PDAs', 2)}`,
                      fragment`${mdTable(
                          ['PDA', 'Seeds'],
                          programNode.pdas.map(p => {
                              const link = mdLink(pascalCase(p.name), `pdas/${camelCase(p.name)}.md`);
                              const seedCount = p.seeds.length;
                              const seedSummary =
                                  seedCount === 0 ? 'None' : `${seedCount} seed${seedCount > 1 ? 's' : ''}`;
                              return [link, seedSummary];
                          }),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // Types summary.
    const typesFragment =
        programNode.definedTypes.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Types', 2)}`,
                      fragment`${mdTable(
                          ['Type', 'Kind'],
                          programNode.definedTypes.map(t => {
                              const link = mdLink(pascalCase(t.name), `types/${camelCase(t.name)}.md`);
                              const resolved = resolveNestedTypeNode(t.type);
                              let kind = 'alias';
                              if (resolved.kind === 'structTypeNode') kind = 'struct';
                              else if (resolved.kind === 'enumTypeNode') kind = 'enum';
                              return [link, kind];
                          }),
                      )}`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    // Errors link.
    const errors = programNode.errors ?? [];
    const errorsFragment =
        errors.length > 0
            ? mergeFragments(
                  [
                      fragment`${mdHeading('Errors', 2)}`,
                      fragment`This program defines ${errors.length} error${errors.length > 1 ? 's' : ''}. See ${mdLink('Errors', 'errors.md')}.`,
                  ],
                  cs => cs.join('\n\n'),
              )
            : undefined;

    return mergeFragments(
        [
            titleFragment,
            addressFragment,
            docsFragment,
            installFragment,
            accountsFragment,
            instructionsFragment,
            pdasFragment,
            typesFragment,
            errorsFragment,
        ],
        cs => cs.join('\n\n'),
    );
}

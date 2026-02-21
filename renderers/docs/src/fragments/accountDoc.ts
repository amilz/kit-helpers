import { AccountNode, isNode, pascalCase, resolveNestedTypeNode } from '@codama/nodes';
import { getByteSizeVisitor, LinkableDictionary, visit } from '@codama/visitors-core';

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
import { getFieldsTableFragment } from './fieldsTable';

export function getAccountDocFragment(input: { accountNode: AccountNode; scope: DocsRenderScope }): Fragment {
    const { accountNode, scope } = input;
    const { nameApi, packageName } = scope;
    const name = pascalCase(accountNode.name);
    const typeStringVisitor = getTypeStringVisitor();
    const docs = accountNode.docs ?? [];
    const structType = resolveNestedTypeNode(accountNode.data);

    // Title + description.
    const titleFragment = fragment`${mdHeading(name, 1)}`;
    const docsFragment = docs.length > 0 ? fragment`${docs.join('\n')}` : undefined;

    // Fields table.
    const fieldsFragment = mergeFragments(
        [fragment`${mdHeading('Fields', 2)}`, getFieldsTableFragment(structType.fields, typeStringVisitor)],
        cs => cs.join('\n\n'),
    );

    // Size.
    let sizeText: string;
    try {
        const byteSize = visit(accountNode.data, getByteSizeVisitor(new LinkableDictionary()));
        sizeText = byteSize !== null ? `${byteSize} bytes` : 'Variable';
    } catch {
        sizeText = 'Variable';
    }
    const sizeFragment = fragment`${mdHeading('Size', 2)}\n\n${sizeText}`;

    // Discriminator.
    const discriminators = accountNode.discriminators ?? [];
    const discriminatorFragment =
        discriminators.length > 0
            ? fragment`${mdHeading('Discriminator', 2)}\n\n${mdTable(
                  ['Type', 'Field', 'Offset'],
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

    // Fetch example.
    const fetchFn = nameApi.accountFetchFunction(accountNode.name);
    const fetchFragment = mergeFragments(
        [
            fragment`${mdHeading('Fetch', 2)}`,
            fragment`${mdCodeBlock(`const account = await ${fetchFn}(rpc, address);`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Fetch maybe example.
    const fetchMaybeFn = nameApi.accountFetchMaybeFunction(accountNode.name);
    const fetchMaybeFragment = mergeFragments(
        [
            fragment`${mdHeading('Fetch (Maybe)', 2)}`,
            fragment`${mdCodeBlock(`const maybeAccount = await ${fetchMaybeFn}(rpc, address);`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Decode example.
    const decodeFn = nameApi.accountDecodeFunction(accountNode.name);
    const decodeFragment = mergeFragments(
        [fragment`${mdHeading('Decode', 2)}`, fragment`${mdCodeBlock(`const account = ${decodeFn}(encodedAccount);`)}`],
        cs => cs.join('\n\n'),
    );

    // Batch fetch example.
    const fetchAllFn = nameApi.accountFetchAllFunction(accountNode.name);
    const fetchAllFragment = mergeFragments(
        [
            fragment`${mdHeading('Fetch All', 2)}`,
            fragment`${mdCodeBlock(`const accounts = await ${fetchAllFn}(rpc, addresses);`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Import hint.
    const importFragment = mergeFragments(
        [
            fragment`${mdHeading('Import', 2)}`,
            fragment`${mdCodeBlock(`import { ${fetchFn}, ${decodeFn} } from '${packageName}';`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    return mergeFragments(
        [
            titleFragment,
            docsFragment,
            importFragment,
            fieldsFragment,
            sizeFragment,
            discriminatorFragment,
            fetchFragment,
            fetchMaybeFragment,
            decodeFragment,
            fetchAllFragment,
        ],
        cs => cs.join('\n\n'),
    );
}

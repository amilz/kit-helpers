import { DefinedTypeNode, isNode, isScalarEnum, pascalCase, resolveNestedTypeNode } from '@codama/nodes';
import { visit } from '@codama/visitors-core';

import {
    type DocsRenderScope,
    type Fragment,
    fragment,
    getTypeStringVisitor,
    mdCodeBlock,
    mdHeading,
    mdList,
    mdTable,
    mergeFragments,
} from '../utils';
import { getFieldsTableFragment } from './fieldsTable';

export function getTypeDocFragment(input: { definedTypeNode: DefinedTypeNode; scope: DocsRenderScope }): Fragment {
    const { definedTypeNode, scope } = input;
    const { nameApi, packageName } = scope;
    const name = pascalCase(definedTypeNode.name);
    const typeStringVisitor = getTypeStringVisitor();
    const docs = definedTypeNode.docs ?? [];

    const titleFragment = fragment`${mdHeading(name, 1)}`;
    const docsFragment = docs.length > 0 ? fragment`${docs.join('\n')}` : undefined;

    // Import hint.
    const decoderFn = nameApi.decoderFunction(definedTypeNode.name);
    const encoderFn = nameApi.encoderFunction(definedTypeNode.name);
    const importFragment = mergeFragments(
        [
            fragment`${mdHeading('Import', 2)}`,
            fragment`${mdCodeBlock(`import { type ${name}, ${decoderFn}, ${encoderFn} } from '${packageName}';`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    // Type body — depends on the kind.
    const typeNode = definedTypeNode.type;
    let bodyFragment: Fragment;

    if (isNode(typeNode, 'structTypeNode')) {
        bodyFragment = mergeFragments(
            [fragment`${mdHeading('Fields', 2)}`, getFieldsTableFragment(typeNode.fields, typeStringVisitor)],
            cs => cs.join('\n\n'),
        );
    } else if (isNode(typeNode, 'enumTypeNode')) {
        bodyFragment = getEnumBodyFragment(typeNode, typeStringVisitor);
    } else {
        // Simple type alias.
        const typeStr: string = visit(typeNode, typeStringVisitor);
        bodyFragment = mergeFragments([fragment`${mdHeading('Type', 2)}`, fragment`\`${typeStr}\``], cs =>
            cs.join('\n\n'),
        );
    }

    // Codec functions.
    const codecFragment = mergeFragments(
        [
            fragment`${mdHeading('Codec', 2)}`,
            fragment`${mdCodeBlock(`const encoder = ${encoderFn}();\nconst decoder = ${decoderFn}();`)}`,
        ],
        cs => cs.join('\n\n'),
    );

    return mergeFragments([titleFragment, docsFragment, importFragment, bodyFragment, codecFragment], cs =>
        cs.join('\n\n'),
    );
}

function getEnumBodyFragment(
    enumType: Extract<DefinedTypeNode['type'], { kind: 'enumTypeNode' }>,
    typeStringVisitor: ReturnType<typeof getTypeStringVisitor>,
): Fragment {
    const isScalar = isScalarEnum(enumType);

    if (isScalar) {
        const rows = enumType.variants.map((v, i) => [`\`${v.name}\``, `${i}`]);
        return mergeFragments(
            [fragment`${mdHeading('Variants', 2)}`, fragment`${mdTable(['Variant', 'Discriminator'], rows)}`],
            cs => cs.join('\n\n'),
        );
    }

    // Non-scalar enum — variants may have data.
    const items = enumType.variants.map(v => {
        if (isNode(v, 'enumEmptyVariantTypeNode')) {
            return `\`${v.name}\``;
        }
        if (isNode(v, 'enumTupleVariantTypeNode')) {
            const tupleType: string = visit(v.tuple, typeStringVisitor);
            return `\`${v.name}\` — ${tupleType}`;
        }
        if (isNode(v, 'enumStructVariantTypeNode')) {
            const structNode = resolveNestedTypeNode(v.struct);
            const fields = structNode.fields
                .map(f => {
                    const ft: string = visit(f.type, typeStringVisitor);
                    return `\`${f.name}: ${ft}\``;
                })
                .join(', ');
            return `\`${v.name}\` — { ${fields} }`;
        }
        // enumEmptyVariantTypeNode or unknown variant
        return `\`${(v as { name: string }).name}\``;
    });

    return mergeFragments([fragment`${mdHeading('Variants', 2)}`, fragment`${mdList(items)}`], cs => cs.join('\n\n'));
}

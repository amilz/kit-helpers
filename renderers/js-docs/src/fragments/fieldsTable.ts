import { REGISTERED_TYPE_NODE_KINDS, StructFieldTypeNode } from '@codama/nodes';
import { visit, Visitor } from '@codama/visitors-core';

import { Fragment, fragment, mdTable } from '../utils';

export type TypeStringVisitor = Visitor<string, (typeof REGISTERED_TYPE_NODE_KINDS)[number] | 'definedTypeLinkNode'>;

export function getFieldsTableFragment(fields: StructFieldTypeNode[], typeStringVisitor: TypeStringVisitor): Fragment {
    if (fields.length === 0) {
        return fragment`_No fields._`;
    }

    const hasDocs = fields.some(f => (f.docs ?? []).length > 0);
    const headers = hasDocs ? ['Field', 'Type', 'Description'] : ['Field', 'Type'];
    const rows = fields.map(f => {
        const typeStr: string = visit(f.type, typeStringVisitor);
        const row = [`\`${f.name}\``, `\`${typeStr}\``];
        if (hasDocs) {
            row.push((f.docs ?? []).join(' '));
        }
        return row;
    });

    return fragment`${mdTable(headers, rows)}`;
}

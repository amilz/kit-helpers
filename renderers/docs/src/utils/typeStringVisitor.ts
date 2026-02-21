import { isScalarEnum, REGISTERED_TYPE_NODE_KINDS, resolveNestedTypeNode } from '@codama/nodes';
import { extendVisitor, pipe, staticVisitor, visit, Visitor } from '@codama/visitors-core';

/**
 * Returns a visitor that converts Codama type nodes to human-readable
 * TypeScript type strings for use in documentation.
 */
export function getTypeStringVisitor(): Visitor<
    string,
    (typeof REGISTERED_TYPE_NODE_KINDS)[number] | 'definedTypeLinkNode'
> {
    return pipe(
        staticVisitor(() => 'unknown', {
            keys: [...REGISTERED_TYPE_NODE_KINDS, 'definedTypeLinkNode'],
        }),
        visitor =>
            extendVisitor(visitor, {
                visitAmountType() {
                    return 'bigint';
                },

                visitArrayType(node, { self }) {
                    const itemType = visit(node.item, self);
                    return `Array<${itemType}>`;
                },

                visitBooleanType() {
                    return 'boolean';
                },

                visitBytesType() {
                    return 'Uint8Array';
                },

                visitDateTimeType() {
                    return 'bigint';
                },

                visitDefinedTypeLink(node) {
                    return node.name;
                },

                visitEnumEmptyVariantType(node) {
                    return node.name;
                },

                visitEnumStructVariantType(node) {
                    return node.name;
                },

                visitEnumTupleVariantType(node) {
                    return node.name;
                },

                visitEnumType(node, { self }) {
                    if (isScalarEnum(node)) {
                        return node.variants.map(v => `'${v.name}'`).join(' | ');
                    }
                    return node.variants.map(v => visit(v, self)).join(' | ');
                },

                visitFixedSizeType(node, { self }) {
                    return visit(node.type, self);
                },

                visitHiddenPrefixType(node, { self }) {
                    return visit(node.type, self);
                },

                visitHiddenSuffixType(node, { self }) {
                    return visit(node.type, self);
                },

                visitMapType(node, { self }) {
                    const keyType = visit(node.key, self);
                    const valueType = visit(node.value, self);
                    return `Map<${keyType}, ${valueType}>`;
                },

                visitNumberType(node) {
                    const bigintFormats = new Set(['u64', 'u128', 'i64', 'i128']);
                    return bigintFormats.has(node.format) ? 'bigint' : 'number';
                },

                visitOptionType(node, { self }) {
                    const innerType = visit(resolveNestedTypeNode(node.item), self);
                    return `Option<${innerType}>`;
                },

                visitPostOffsetType(node, { self }) {
                    return visit(node.type, self);
                },

                visitPreOffsetType(node, { self }) {
                    return visit(node.type, self);
                },

                visitPublicKeyType() {
                    return 'Address';
                },

                visitRemainderOptionType(node, { self }) {
                    const innerType = visit(resolveNestedTypeNode(node.item), self);
                    return `Option<${innerType}>`;
                },

                visitSentinelType(node, { self }) {
                    return visit(node.type, self);
                },

                visitSetType(node, { self }) {
                    const itemType = visit(node.item, self);
                    return `Set<${itemType}>`;
                },

                visitSizePrefixType(node, { self }) {
                    return visit(node.type, self);
                },

                visitSolAmountType() {
                    return 'bigint';
                },

                visitStringType() {
                    return 'string';
                },

                visitStructFieldType(node, { self }) {
                    return visit(node.type, self);
                },

                visitStructType(node, { self }) {
                    if (node.fields.length === 0) return '{}';
                    const fields = node.fields.map(f => `${f.name}: ${visit(f, self)}`);
                    return `{ ${fields.join('; ')} }`;
                },

                visitTupleType(node, { self }) {
                    const items = node.items.map(item => visit(item, self));
                    return `[${items.join(', ')}]`;
                },

                visitZeroableOptionType(node, { self }) {
                    const innerType = visit(resolveNestedTypeNode(node.item), self);
                    return `Option<${innerType}>`;
                },
            }),
    );
}

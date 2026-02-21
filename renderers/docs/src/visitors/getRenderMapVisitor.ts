import { camelCase, getAllInstructionsWithSubs, getAllPrograms } from '@codama/nodes';
import { createRenderMap, mergeRenderMaps } from '@codama/renderers-core';
import {
    extendVisitor,
    getLastNodeFromPath,
    LinkableDictionary,
    NodeStack,
    pipe,
    recordLinkablesOnFirstVisitVisitor,
    recordNodeStackVisitor,
    staticVisitor,
    visit,
} from '@codama/visitors-core';

import {
    getAccountDocFragment,
    getErrorDocFragment,
    getInstructionDocFragment,
    getPdaDocFragment,
    getProgramOverviewFragment,
    getTypeDocFragment,
} from '../fragments';
import {
    DEFAULT_NAME_TRANSFORMERS,
    DEFAULT_PACKAGE_NAME,
    type DocsRenderScope,
    type Fragment,
    type GetDocsRenderMapOptions,
    getNameApi,
} from '../utils';

export function getRenderMapVisitor(options: GetDocsRenderMapOptions = {}) {
    const linkables = new LinkableDictionary();
    const stack = new NodeStack();

    const renderScope: DocsRenderScope = {
        nameApi: getNameApi({ ...DEFAULT_NAME_TRANSFORMERS, ...options.nameTransformers }),
        packageName: options.packageName ?? DEFAULT_PACKAGE_NAME,
    };

    return pipe(
        staticVisitor(() => createRenderMap<Fragment>(), {
            keys: ['rootNode', 'programNode', 'pdaNode', 'accountNode', 'instructionNode', 'definedTypeNode'],
        }),
        v =>
            extendVisitor(v, {
                visitAccount() {
                    const accountPath = stack.getPath('accountNode');
                    const accountNode = getLastNodeFromPath(accountPath);
                    return createRenderMap(
                        `accounts/${camelCase(accountNode.name)}.md`,
                        getAccountDocFragment({ accountNode, scope: renderScope }),
                    );
                },

                visitDefinedType() {
                    const definedTypePath = stack.getPath('definedTypeNode');
                    const definedTypeNode = getLastNodeFromPath(definedTypePath);
                    return createRenderMap(
                        `types/${camelCase(definedTypeNode.name)}.md`,
                        getTypeDocFragment({ definedTypeNode, scope: renderScope }),
                    );
                },

                visitInstruction() {
                    const instructionPath = stack.getPath('instructionNode');
                    const instructionNode = getLastNodeFromPath(instructionPath);
                    return createRenderMap(
                        `instructions/${camelCase(instructionNode.name)}.md`,
                        getInstructionDocFragment({ instructionNode, scope: renderScope }),
                    );
                },

                visitPda() {
                    const pdaPath = stack.getPath('pdaNode');
                    const pdaNode = getLastNodeFromPath(pdaPath);
                    return createRenderMap(
                        `pdas/${camelCase(pdaNode.name)}.md`,
                        getPdaDocFragment({ pdaNode, scope: renderScope }),
                    );
                },

                visitProgram(node, { self }) {
                    const overviewMap = createRenderMap(
                        'index.md',
                        getProgramOverviewFragment({ programNode: node, scope: renderScope }),
                    );

                    const errorFragment = getErrorDocFragment({ programNode: node, scope: renderScope });
                    const errorMap = errorFragment
                        ? createRenderMap('errors.md', errorFragment)
                        : createRenderMap<Fragment>();

                    return mergeRenderMaps([
                        overviewMap,
                        errorMap,
                        ...node.pdas.map(p => visit(p, self)),
                        ...node.accounts.map(a => visit(a, self)),
                        ...node.definedTypes.map(t => visit(t, self)),
                        ...getAllInstructionsWithSubs(node, { leavesOnly: true }).map(i => visit(i, self)),
                    ]);
                },

                visitRoot(node, { self }) {
                    return mergeRenderMaps(getAllPrograms(node).map(p => visit(p, self)));
                },
            }),
        v => recordNodeStackVisitor(v, stack),
        v => recordLinkablesOnFirstVisitVisitor(v, linkables),
    );
}

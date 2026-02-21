import { camelCase, getAllAccounts, getAllInstructionsWithSubs, getAllPdas, getAllPrograms } from '@codama/nodes';
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
    getAccountHookPageFragment,
    getIndexPageFragment,
    getInstructionHookFragment,
    getPdaHookFragment,
    getProgramHookFragment,
} from '../fragments';
import {
    DEFAULT_CLIENT_PACKAGE,
    DEFAULT_KIT_IMPORT_STRATEGY,
    DEFAULT_NAME_TRANSFORMERS,
    type Fragment,
    getNameApi,
    getPageFragment,
    type GetReactHooksRenderMapOptions,
    type ReactHooksRenderScope,
} from '../utils';

export function getRenderMapVisitor(options: GetReactHooksRenderMapOptions = {}) {
    const linkables = new LinkableDictionary();
    const stack = new NodeStack();

    const renderScope: ReactHooksRenderScope = {
        clientPackage: options.clientPackage ?? DEFAULT_CLIENT_PACKAGE,
        kitImportStrategy: options.kitImportStrategy ?? DEFAULT_KIT_IMPORT_STRATEGY,
        linkables,
        nameApi: getNameApi({ ...DEFAULT_NAME_TRANSFORMERS, ...options.nameTransformers }),
    };

    const asPage = <TFragment extends Fragment | undefined>(
        frag: TFragment,
        scope: ReactHooksRenderScope = renderScope,
    ): TFragment => {
        if (!frag) return undefined as TFragment;
        return getPageFragment(frag, scope) as TFragment;
    };

    return pipe(
        staticVisitor(() => createRenderMap<Fragment>(), {
            keys: ['rootNode', 'programNode', 'pdaNode', 'accountNode', 'instructionNode'],
        }),
        v =>
            extendVisitor(v, {
                visitAccount() {
                    const accountPath = stack.getPath('accountNode');
                    const accountNode = getLastNodeFromPath(accountPath);
                    return createRenderMap(
                        `hooks/${camelCase(accountNode.name)}.ts`,
                        asPage(
                            getAccountHookPageFragment({
                                ...renderScope,
                                accountPath,
                            }),
                        ),
                    );
                },

                visitInstruction() {
                    const instructionPath = stack.getPath('instructionNode');
                    const instructionNode = getLastNodeFromPath(instructionPath);
                    // Instructions are in hooks/instructions/ — one level deeper than hooks/.
                    const subDirScope = { ...renderScope, clientPackage: `../${renderScope.clientPackage}` };
                    return createRenderMap(
                        `hooks/instructions/${camelCase(instructionNode.name)}.ts`,
                        asPage(
                            getInstructionHookFragment({
                                ...subDirScope,
                                instructionPath,
                            }),
                            subDirScope,
                        ),
                    );
                },

                visitPda() {
                    const pdaPath = stack.getPath('pdaNode');
                    const pdaNode = getLastNodeFromPath(pdaPath);
                    // PDAs are in hooks/pdas/ — one level deeper than hooks/.
                    const subDirScope = { ...renderScope, clientPackage: `../${renderScope.clientPackage}` };
                    return createRenderMap(
                        `hooks/pdas/${camelCase(pdaNode.name)}.ts`,
                        asPage(
                            getPdaHookFragment({
                                ...subDirScope,
                                pdaPath,
                            }),
                            subDirScope,
                        ),
                    );
                },

                visitProgram(node, { self }) {
                    return mergeRenderMaps([
                        createRenderMap(
                            `hooks/${camelCase(node.name)}.ts`,
                            asPage(
                                getProgramHookFragment({
                                    ...renderScope,
                                    programNode: node,
                                }),
                            ),
                        ),
                        ...node.pdas.map(p => visit(p, self)),
                        ...node.accounts.map(a => visit(a, self)),
                        ...getAllInstructionsWithSubs(node, { leavesOnly: true }).map(i => visit(i, self)),
                    ]);
                },

                visitRoot(node, { self }) {
                    const accountsToExport = getAllAccounts(node);
                    const instructionsToExport = getAllInstructionsWithSubs(node, { leavesOnly: true });
                    const pdasToExport = getAllPdas(node);

                    return mergeRenderMaps([
                        createRenderMap({
                            ['hooks/index.ts']: asPage(getIndexPageFragment(accountsToExport)),
                            ['hooks/instructions/index.ts']: asPage(getIndexPageFragment(instructionsToExport)),
                            ['hooks/pdas/index.ts']: asPage(getIndexPageFragment(pdasToExport)),
                        }),
                        ...getAllPrograms(node).map(p => visit(p, self)),
                    ]);
                },
            }),
        v => recordNodeStackVisitor(v, stack),
        v => recordLinkablesOnFirstVisitVisitor(v, linkables),
    );
}

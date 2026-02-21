import { DEFAULT_CLIENT_PACKAGE, DEFAULT_KIT_IMPORT_STRATEGY, KitImportStrategy } from './options';

/**
 * Module aliases used in fragments. These are resolved to actual import paths
 * via the module maps below.
 */
const DEFAULT_EXTERNAL_MODULE_MAP: Record<string, string> = {
    react: 'react',
    solanaAccounts: '@solana/kit',
    solanaAddresses: '@solana/kit',
    solanaCodecsCore: '@solana/kit',
    solanaFunctional: '@solana/kit',
    solanaKeys: '@solana/kit',
    solanaPrograms: '@solana/kit',
    solanaRpc: '@solana/kit',
    solanaRpcSubscriptions: '@solana/kit',
    solanaRpcTypes: '@solana/kit',
    solanaSigners: '@solana/kit',
    solanaTransactionConfirmation: '@solana/kit',
    solanaTransactionMessages: '@solana/kit',
    solanaTransactions: '@solana/kit',
};

const DEFAULT_GRANULAR_EXTERNAL_MODULE_MAP: Record<string, string> = {
    react: 'react',
    solanaAccounts: '@solana/accounts',
    solanaAddresses: '@solana/addresses',
    solanaCodecsCore: '@solana/codecs',
    solanaFunctional: '@solana/functional',
    solanaKeys: '@solana/keys',
    solanaPrograms: '@solana/programs',
    solanaRpc: '@solana/rpc',
    solanaRpcSubscriptions: '@solana/rpc-subscriptions',
    solanaRpcTypes: '@solana/rpc-types',
    solanaSigners: '@solana/signers',
    solanaTransactionConfirmation: '@solana/transaction-confirmation',
    solanaTransactionMessages: '@solana/transaction-messages',
    solanaTransactions: '@solana/transactions',
};

type ImportInput = string;
type Module = string;
type UsedIdentifier = string;
type ImportInfo = Readonly<{
    importedIdentifier: string;
    isType: boolean;
    usedIdentifier: UsedIdentifier;
}>;

export type ImportMap = ReadonlyMap<Module, ReadonlyMap<UsedIdentifier, ImportInfo>>;

export function createImportMap(): ImportMap {
    return Object.freeze(new Map());
}

export function parseImportInput(input: ImportInput): ImportInfo {
    const matches = input.match(/^(type )?([^ ]+)(?: as (.+))?$/);
    if (!matches) return Object.freeze({ importedIdentifier: input, isType: false, usedIdentifier: input });

    const [_, isType, name, alias] = matches;
    return Object.freeze({
        importedIdentifier: name,
        isType: !!isType,
        usedIdentifier: alias ?? name,
    });
}

export function addToImportMap(importMap: ImportMap, module: Module, imports: ImportInput[]): ImportMap {
    const parsedImports = imports.map(parseImportInput).map(i => [i.usedIdentifier, i] as const);
    return mergeImportMaps([importMap, new Map([[module, new Map(parsedImports)]])]);
}

export function mergeImportMaps(importMaps: ImportMap[]): ImportMap {
    if (importMaps.length === 0) return createImportMap();
    if (importMaps.length === 1) return importMaps[0];
    const mergedMap = new Map(importMaps[0]);
    for (const map of importMaps.slice(1)) {
        for (const [module, imports] of map) {
            const mergedModuleMap = (mergedMap.get(module) ?? new Map()) as Map<UsedIdentifier, ImportInfo>;
            for (const [usedIdentifier, importInfo] of imports) {
                const existingImportInfo = mergedModuleMap.get(usedIdentifier);
                const shouldOverwriteTypeOnly =
                    existingImportInfo &&
                    existingImportInfo.importedIdentifier === importInfo.importedIdentifier &&
                    existingImportInfo.isType &&
                    !importInfo.isType;
                if (!existingImportInfo || shouldOverwriteTypeOnly) {
                    mergedModuleMap.set(usedIdentifier, importInfo);
                }
            }
            mergedMap.set(module, mergedModuleMap);
        }
    }
    return Object.freeze(mergedMap);
}

export function importMapToString(
    importMap: ImportMap,
    clientPackage: string = DEFAULT_CLIENT_PACKAGE,
    kitImportStrategy: KitImportStrategy = DEFAULT_KIT_IMPORT_STRATEGY,
): string {
    const resolvedMap = resolveImportMapModules(importMap, clientPackage, kitImportStrategy);

    return [...resolvedMap.entries()]
        .sort(([a], [b]) => {
            const relative = Number(a.startsWith('.')) - Number(b.startsWith('.'));
            if (relative !== 0) return relative;
            return a.localeCompare(b);
        })
        .map(([module, imports]) => {
            const innerImports = [...imports.values()]
                .map(importInfoToString)
                .sort((a, b) => a.localeCompare(b))
                .join(', ');
            return `import { ${innerImports} } from '${module}';`;
        })
        .join('\n');
}

function resolveImportMapModules(
    importMap: ImportMap,
    clientPackage: string,
    kitImportStrategy: KitImportStrategy,
): ImportMap {
    const defaultExternalModuleMap =
        kitImportStrategy === 'granular' ? DEFAULT_GRANULAR_EXTERNAL_MODULE_MAP : DEFAULT_EXTERNAL_MODULE_MAP;

    const internalModuleMap: Record<string, string> = {
        generatedClient: clientPackage,
    };

    const dependencyMap = {
        ...defaultExternalModuleMap,
        ...internalModuleMap,
    };

    return mergeImportMaps(
        [...importMap.entries()].map(([module, imports]) => {
            const resolvedModule = dependencyMap[module] ?? module;
            return new Map([[resolvedModule, imports]]);
        }),
    );
}

function importInfoToString({ importedIdentifier, isType, usedIdentifier }: ImportInfo): string {
    const alias = importedIdentifier !== usedIdentifier ? ` as ${usedIdentifier}` : '';
    return `${isType ? 'type ' : ''}${importedIdentifier}${alias}`;
}

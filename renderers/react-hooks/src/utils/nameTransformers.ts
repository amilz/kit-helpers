import { camelCase, capitalize, kebabCase, pascalCase, snakeCase, titleCase } from '@codama/nodes';

export type NameTransformerHelpers = {
    camelCase: (name: string) => string;
    capitalize: (name: string) => string;
    kebabCase: (name: string) => string;
    pascalCase: (name: string) => string;
    snakeCase: (name: string) => string;
    titleCase: (name: string) => string;
};

export type NameTransformer = (name: string, helpers: NameTransformerHelpers) => string;

export type HookNameTransformerKey =
    | 'accountFromSeedsHook'
    | 'accountHook'
    | 'batchAccountHook'
    | 'instructionHook'
    | 'pdaHook'
    | 'programHook';

export type ClientNameTransformerKey =
    | 'accountDecodeFunction'
    | 'accountFetchFunction'
    | 'dataType'
    | 'decoderFunction'
    | 'instructionAsyncFunction'
    | 'instructionAsyncInputType'
    | 'instructionSyncFunction'
    | 'instructionSyncInputType'
    | 'pdaFindFunction'
    | 'pdaSeedsType'
    | 'programAddressConstant'
    | 'programErrorUnion'
    | 'programGetErrorMessageFunction'
    | 'programIsErrorFunction';

export type NameTransformerKey = ClientNameTransformerKey | HookNameTransformerKey;

export type NameTransformers = Record<NameTransformerKey, NameTransformer>;

export type NameApi = Record<NameTransformerKey, (name: string) => string>;

export function getNameApi(transformers: NameTransformers): NameApi {
    const helpers = {
        camelCase,
        capitalize,
        kebabCase,
        pascalCase,
        snakeCase,
        titleCase,
    };
    return Object.fromEntries(
        Object.entries(transformers).map(([key, transformer]) => [key, (name: string) => transformer(name, helpers)]),
    ) as NameApi;
}

export const DEFAULT_NAME_TRANSFORMERS: NameTransformers = {
    accountDecodeFunction: name => `decode${pascalCase(name)}`,
    accountFetchFunction: name => `fetch${pascalCase(name)}`,
    accountFromSeedsHook: name => `use${pascalCase(name)}FromSeeds`,
    accountHook: name => `use${pascalCase(name)}`,
    batchAccountHook: name => `use${pascalCase(name)}s`,
    dataType: name => `${pascalCase(name)}`,
    decoderFunction: name => `get${pascalCase(name)}Decoder`,
    instructionAsyncFunction: name => `get${pascalCase(name)}InstructionAsync`,
    instructionAsyncInputType: name => `${pascalCase(name)}AsyncInput`,
    instructionHook: name => `use${pascalCase(name)}`,
    instructionSyncFunction: name => `get${pascalCase(name)}Instruction`,
    instructionSyncInputType: name => `${pascalCase(name)}Input`,
    pdaFindFunction: name => `find${pascalCase(name)}Pda`,
    pdaHook: name => `use${pascalCase(name)}Address`,
    pdaSeedsType: name => `${pascalCase(name)}Seeds`,
    programAddressConstant: name => `${snakeCase(name).toUpperCase()}_PROGRAM_ADDRESS`,
    programErrorUnion: name => `${pascalCase(name)}Error`,
    programGetErrorMessageFunction: name => `get${pascalCase(name)}ErrorMessage`,
    programHook: name => `useProgram${pascalCase(name)}`,
    programIsErrorFunction: name => `is${pascalCase(name)}Error`,
};

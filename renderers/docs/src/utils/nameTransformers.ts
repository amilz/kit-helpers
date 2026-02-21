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

export type NameTransformerKey =
    | 'accountDecodeFunction'
    | 'accountFetchAllFunction'
    | 'accountFetchFunction'
    | 'accountFetchMaybeFunction'
    | 'accountType'
    | 'dataType'
    | 'decoderFunction'
    | 'encoderFunction'
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
    accountFetchAllFunction: name => `fetchAll${pascalCase(name)}`,
    accountFetchFunction: name => `fetch${pascalCase(name)}`,
    accountFetchMaybeFunction: name => `fetchMaybe${pascalCase(name)}`,
    accountType: name => `${pascalCase(name)}`,
    dataType: name => `${pascalCase(name)}`,
    decoderFunction: name => `get${pascalCase(name)}Decoder`,
    encoderFunction: name => `get${pascalCase(name)}Encoder`,
    instructionAsyncFunction: name => `get${pascalCase(name)}InstructionAsync`,
    instructionAsyncInputType: name => `${pascalCase(name)}AsyncInput`,
    instructionSyncFunction: name => `get${pascalCase(name)}Instruction`,
    instructionSyncInputType: name => `${pascalCase(name)}Input`,
    pdaFindFunction: name => `find${pascalCase(name)}Pda`,
    pdaSeedsType: name => `${pascalCase(name)}Seeds`,
    programAddressConstant: name => `${snakeCase(name).toUpperCase()}_PROGRAM_ADDRESS`,
    programErrorUnion: name => `${pascalCase(name)}Error`,
    programGetErrorMessageFunction: name => `get${pascalCase(name)}ErrorMessage`,
    programIsErrorFunction: name => `is${pascalCase(name)}Error`,
};

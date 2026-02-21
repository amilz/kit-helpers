import { getFromRenderMap, RenderMap } from '@codama/renderers-core';
import { LinkableDictionary } from '@codama/visitors-core';
import { Plugin } from 'prettier';
import * as estreePlugin from 'prettier/plugins/estree';
import * as typeScriptPlugin from 'prettier/plugins/typescript';
import { format } from 'prettier/standalone';
import { expect } from 'vitest';

import {
    DEFAULT_CLIENT_PACKAGE,
    DEFAULT_KIT_IMPORT_STRATEGY,
    DEFAULT_NAME_TRANSFORMERS,
    type Fragment,
    getNameApi,
    importMapToString,
    type KitImportStrategy,
    type ReactHooksRenderScope,
} from '../src/utils';

const PRETTIER_OPTIONS: Parameters<typeof format>[1] = {
    arrowParens: 'always',
    parser: 'typescript',
    plugins: [estreePlugin as Plugin<unknown>, typeScriptPlugin],
    printWidth: 80,
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'none',
    useTabs: false,
};

export function getDefaultScope(): ReactHooksRenderScope {
    return {
        clientPackage: DEFAULT_CLIENT_PACKAGE,
        kitImportStrategy: DEFAULT_KIT_IMPORT_STRATEGY,
        linkables: new LinkableDictionary(),
        nameApi: getNameApi(DEFAULT_NAME_TRANSFORMERS),
    };
}

export async function renderMapContains(
    renderMap: RenderMap<Fragment>,
    key: string,
    expected: (RegExp | string)[] | RegExp | string,
) {
    expect(renderMap.has(key), `RenderMap is missing key "${key}".`).toBe(true);
    await codeContains(getFromRenderMap(renderMap, key).content, expected);
}

export async function renderMapContainsImports(
    renderMap: RenderMap<Fragment>,
    key: string,
    expectedImports: Record<string, string[]>,
) {
    expect(renderMap.has(key), `RenderMap is missing key "${key}".`).toBe(true);
    const frag = getFromRenderMap(renderMap, key);
    const imports = importMapToString(frag.imports);
    await codeContainsImports(imports, expectedImports);
}

export async function fragmentContains(actual: Fragment | undefined, expected: (RegExp | string)[] | RegExp | string) {
    expect(actual).toBeDefined();
    await codeContains(actual!.content, expected);
}

export async function fragmentContainsImports(
    actual: Fragment | undefined,
    expectedImports: Record<string, string[]>,
    options?: { clientPackage?: string; kitImportStrategy?: KitImportStrategy },
) {
    expect(actual).toBeDefined();
    const imports = importMapToString(actual!.imports, options?.clientPackage, options?.kitImportStrategy);
    await codeContainsImports(imports, expectedImports);
}

async function codeContains(actual: string, expected: (RegExp | string)[] | RegExp | string) {
    const expectedArray = Array.isArray(expected) ? expected : [expected];
    const normalizedActual = await normalizeCode(actual);
    expectedArray.forEach(expectedResult => {
        if (typeof expectedResult === 'string') {
            expect(normalizedActual).toMatch(codeStringAsRegex(expectedResult));
        } else {
            expect(normalizedActual).toMatch(expectedResult);
        }
    });
}

async function codeContainsImports(actual: string, expectedImports: Record<string, string[]>) {
    const normalizedActual = await inlineCode(actual);
    const importPairs = Object.entries(expectedImports).flatMap(([key, value]) => {
        return value.map(v => [key, v] as const);
    });

    importPairs.forEach(([importFrom, importValue]) => {
        expect(normalizedActual).toMatch(new RegExp(`import{[^}]*\\b${importValue}\\b[^}]*}from'${importFrom}'`));
    });
}

function codeStringAsRegex(code: string) {
    const stringAsRegex = escapeRegex(code)
        .replace(/(\w)\s+(\w)/g, '$1\\s+$2')
        .replace(/(\w)\s+(\w)/g, '$1\\s+$2')
        .replace(/\s+/g, '\\s*');
    return new RegExp(stringAsRegex);
}

async function normalizeCode(code: string) {
    try {
        code = await format(code, PRETTIER_OPTIONS);
    } catch {
        // Ignore errors.
    }
    return code.trim();
}

async function inlineCode(code: string) {
    return (await normalizeCode(code)).replace(/\s+/g, ' ').replace(/\s*(\W)\s*/g, '$1');
}

function escapeRegex(stringAsRegex: string) {
    return stringAsRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

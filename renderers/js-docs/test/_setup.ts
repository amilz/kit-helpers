import { getFromRenderMap, RenderMap } from '@codama/renderers-core';
import { expect } from 'vitest';

import { type Fragment } from '../src/utils';

export function renderMapContains(
    renderMap: RenderMap<Fragment>,
    key: string,
    expected: (RegExp | string)[] | RegExp | string,
) {
    expect(renderMap.has(key), `RenderMap is missing key "${key}".`).toBe(true);
    markdownContains(getFromRenderMap(renderMap, key).content, expected);
}

export function renderMapDoesNotContain(
    renderMap: RenderMap<Fragment>,
    key: string,
    unexpected: (RegExp | string)[] | RegExp | string,
) {
    if (!renderMap.has(key)) return;
    const content = getFromRenderMap(renderMap, key).content;
    const items = Array.isArray(unexpected) ? unexpected : [unexpected];
    items.forEach(item => {
        if (typeof item === 'string') {
            expect(content).not.toContain(item);
        } else {
            expect(content).not.toMatch(item);
        }
    });
}

export function renderMapMissing(renderMap: RenderMap<Fragment>, key: string) {
    expect(renderMap.has(key), `RenderMap should not have key "${key}".`).toBe(false);
}

function markdownContains(actual: string, expected: (RegExp | string)[] | RegExp | string) {
    const items = Array.isArray(expected) ? expected : [expected];
    items.forEach(item => {
        if (typeof item === 'string') {
            expect(actual).toContain(item);
        } else {
            expect(actual).toMatch(item);
        }
    });
}

import { BaseFragment, createFragmentTemplate } from '@codama/renderers-core';

export type Fragment = BaseFragment;

function createFragment(content: string): Fragment {
    return Object.freeze({ content });
}

function isFragment(value: unknown): value is Fragment {
    return typeof value === 'object' && value !== null && 'content' in value;
}

export function fragment(template: TemplateStringsArray, ...items: unknown[]): Fragment {
    return createFragmentTemplate(template, items, isFragment, mergeFragments);
}

export function mergeFragments(
    fragments: (Fragment | undefined)[],
    mergeContent: (contents: string[]) => string,
): Fragment {
    const filteredFragments = fragments.filter((f): f is Fragment => f !== undefined);
    return createFragment(mergeContent(filteredFragments.map(f => f.content)));
}

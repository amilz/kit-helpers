import type { LinkableDictionary } from '@codama/visitors-core';

import type { PrettierOptions } from './formatCode';
import type { NameApi, NameTransformers } from './nameTransformers';

export type ReactHooksRenderOptions = GetReactHooksRenderMapOptions & {
    deleteFolderBeforeRendering?: boolean;
    formatCode?: boolean;
    generatedFolder?: string;
    prettierOptions?: PrettierOptions;
};

export type GetReactHooksRenderMapOptions = {
    /**
     * The import path for the generated JS client.
     * Hook files will import account decoders, instruction builders, PDA finders, etc.
     * from this package.
     *
     * @default '../' (relative import — assumes hooks/ is a sibling of the JS client output)
     */
    clientPackage?: string;

    /**
     * Defines how generated code should import from `@solana/kit`.
     * @see KitImportStrategy from @codama/renderers-js
     * @default 'preferRoot'
     */
    kitImportStrategy?: KitImportStrategy;

    /**
     * Partial overrides for generated hook names and JS client reference names.
     */
    nameTransformers?: Partial<NameTransformers>;
};

export type ReactHooksRenderScope = {
    clientPackage: string;
    kitImportStrategy: KitImportStrategy;
    linkables: LinkableDictionary;
    nameApi: NameApi;
};

/**
 * Defines how generated hooks should import from `@solana/kit`.
 * Mirrors the KitImportStrategy from @codama/renderers-js.
 */
export type KitImportStrategy = 'granular' | 'preferRoot' | 'rootOnly';

export const DEFAULT_CLIENT_PACKAGE = '../';
export const DEFAULT_KIT_IMPORT_STRATEGY: KitImportStrategy = 'preferRoot';

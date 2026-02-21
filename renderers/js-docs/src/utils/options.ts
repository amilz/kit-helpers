import type { NameApi, NameTransformers } from './nameTransformers';

export type DocsRenderOptions = GetDocsRenderMapOptions & {
    deleteFolderBeforeRendering?: boolean;
    generatedFolder?: string;
};

export type GetDocsRenderMapOptions = {
    /**
     * Partial overrides for generated function/type names in documentation.
     */
    nameTransformers?: Partial<NameTransformers>;

    /**
     * The package name used in import examples.
     * @default 'my-program-client'
     */
    packageName?: string;
};

export type DocsRenderScope = {
    nameApi: NameApi;
    packageName: string;
};

export const DEFAULT_PACKAGE_NAME = 'my-program-client';

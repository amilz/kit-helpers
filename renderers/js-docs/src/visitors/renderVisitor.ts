import { deleteDirectory, joinPath, writeRenderMap } from '@codama/renderers-core';
import { rootNodeVisitor, visit } from '@codama/visitors-core';

import type { DocsRenderOptions } from '../utils';
import { getRenderMapVisitor } from './getRenderMapVisitor';

export function renderVisitor(packageFolder: string, options: DocsRenderOptions = {}) {
    return rootNodeVisitor(root => {
        const generatedFolder = joinPath(packageFolder, options.generatedFolder ?? 'docs');

        // Delete existing generated folder.
        if (options.deleteFolderBeforeRendering ?? true) {
            deleteDirectory(generatedFolder);
        }

        // Render the new files.
        const renderMap = visit(root, getRenderMapVisitor(options));

        // Write the rendered files to the output directory.
        writeRenderMap(renderMap, generatedFolder);
    });
}

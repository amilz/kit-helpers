#!/usr/bin/env -S node

/**
 * Generates JS client + React hooks from the counter IDL into src/generated/.
 */

const path = require('node:path');
const { visit } = require('@codama/visitors-core');
const { renderVisitor: renderJsVisitor } = require('@codama/renderers-js');
const { renderVisitor: renderHooksVisitor } = require('@kit-helpers/renderer-react-hooks');

const idl = require('./idl.json');

async function main() {
    const projectFolder = __dirname;

    // Generate JS client into src/generated/.
    await visit(idl, renderJsVisitor(projectFolder, { kitImportStrategy: 'rootOnly' }));

    // Generate React hooks alongside the JS client.
    // packageFolder = project root, generatedFolder = 'src/generated' → hooks land in src/generated/hooks/
    // clientPackage = '../' resolves from hooks/ to the JS client root (src/generated/).
    await visit(
        idl,
        renderHooksVisitor(projectFolder, {
            clientPackage: '../',
            deleteFolderBeforeRendering: false,
            generatedFolder: 'src/generated',
            kitImportStrategy: 'rootOnly',
        }),
    );

    console.log('Generated JS client + React hooks in', path.join(projectFolder, 'src', 'generated'));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

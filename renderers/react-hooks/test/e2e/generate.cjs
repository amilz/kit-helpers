#!/usr/bin/env -S node

/**
 * E2E test: generates JS client + React hooks from a Codama IDL,
 * then verifies both compile together with `tsc --noEmit`.
 */

const path = require('node:path');
const { visit } = require('@codama/visitors-core');
const { renderVisitor: renderJsVisitor } = require('@codama/renderers-js');
const { renderVisitor: renderHooksVisitor } = require('../../dist/index.node.cjs');

const idl = require('./idl.json');

async function main() {
    const projectFolder = path.join(__dirname, 'output');

    // Generate JS client.
    await visit(idl, renderJsVisitor(projectFolder, { kitImportStrategy: 'rootOnly' }));

    // Generate React hooks alongside the JS client.
    // The render map keys start with 'hooks/', so generatedFolder = 'src/generated'
    // puts hooks in src/generated/hooks/ (sibling to accounts/, instructions/, etc.)
    // clientPackage = '../' resolves from hooks/ to generated/ (the JS client root).
    await visit(
        idl,
        renderHooksVisitor(projectFolder, {
            clientPackage: '../',
            deleteFolderBeforeRendering: false,
            generatedFolder: 'src/generated',
            kitImportStrategy: 'rootOnly',
        }),
    );

    console.log('✅ Generated JS client + React hooks in', projectFolder);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

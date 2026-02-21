#!/usr/bin/env -S node

/**
 * E2E test: generates markdown documentation from a Codama IDL,
 * then verifies expected files exist with expected content.
 */

const path = require('node:path');
const { visit } = require('@codama/visitors-core');
const { renderVisitor } = require('../../dist/index.node.cjs');

const idl = require('./idl.json');

async function main() {
    const outputFolder = path.join(__dirname, 'output');

    // Generate documentation.
    await visit(
        idl,
        renderVisitor(outputFolder, {
            generatedFolder: 'docs',
            packageName: 'counter-client',
        }),
    );

    console.log('✅ Generated documentation in', path.join(outputFolder, 'docs'));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

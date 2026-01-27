/**
 * 04 - Program Deployment
 *
 * This example demonstrates loading programs into LiteSVM:
 * - addProgram: Load program from bytes
 * - addProgramFromFile: Load program from .so file
 *
 * Note: You need a compiled .so file to run the addProgramFromFile example.
 * Build your program with: cargo build-sbf
 */

import { address, createEmptyClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function main() {
    console.log('=== Program Deployment Example ===\n');

    const client = createEmptyClient().use(litesvm());

    // Method 1: Add program from bytes
    // This is useful when you have the program bytes in memory
    console.log('--- Method 1: Add Program from Bytes ---');

    const programId = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

    // For demonstration, we'll use a minimal program (in practice, use real program bytes)
    // A real program would be loaded from a compiled .so file
    const demoBytes = new Uint8Array([
        // This is not a real program - just for demonstration
        0x7f,
        0x45,
        0x4c,
        0x46, // ELF magic
    ]);

    // Note: This will fail with invalid program bytes, but shows the API
    try {
        client.svm.addProgram(programId, demoBytes);
        console.log('Program added at:', programId);
    } catch (e) {
        console.log('(Expected) Cannot add invalid program bytes');
        console.log('In practice, load real program bytes from a .so file');
    }

    // Method 2: Add program from file path
    // This is the most common way to load programs for testing
    console.log('\n--- Method 2: Add Program from File ---');

    // Replace with your actual .so file path
    const soFilePath = '/some/path/to/your/program.so';

    if (fs.existsSync(soFilePath)) {
        const customProgramId = await generateKeyPairSigner().then(s => s.address);

        try {
            client.svm.addProgramFromFile(customProgramId, soFilePath);
            console.log('Program loaded from file!');
            console.log('  Program ID:', customProgramId);
            console.log('  File:', path.basename(soFilePath));

            // Verify the program account exists
            const programAccount = client.svm.getAccount(customProgramId);
            if (programAccount.exists) {
                console.log('  Executable:', programAccount.executable);
                console.log('  Data size:', programAccount.data.length, 'bytes');
            }
        } catch (e) {
            console.log('Failed to load program:', e);
        }
    } else {
        console.log('No .so file found at:', soFilePath);
        console.log('To test this, build a Solana program with: cargo build-sbf');
        console.log('Then update the path in this example.');
    }
}

main().catch(console.error);

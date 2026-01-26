/**
 * 08 - Builder Methods
 *
 * This example demonstrates LiteSVM's builder pattern configuration:
 * - All builder methods return LiteSVM for chaining
 * - Configure compute budget, signature verification, and more
 */

import { createEmptyClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';

async function main() {
    console.log('=== Builder Methods Example ===\n');

    const client = createEmptyClient().use(litesvm());

    console.log('--- Basic Configuration ---');

    // Chain multiple configuration methods
    client.svm
        // Disable signature verification (faster tests)
        .withSigverify(false)
        // Disable blockhash expiration check (simpler tests)
        .withBlockhashCheck(false)
        // Enable sysvars (Clock, Rent, etc.)
        .withSysvars()
        // Enable built-in programs (secp256k1, ed25519, etc.)
        .withBuiltins()
        // Enable precompiles
        .withPrecompiles();

    console.log('Configuration applied:');
    console.log('  - Signature verification: disabled');
    console.log('  - Blockhash check: disabled');
    console.log('  - Sysvars: enabled');
    console.log('  - Builtins: enabled');
    console.log('  - Precompiles: enabled');

    // Set initial lamports for fee payer accounts
    console.log('\n--- withLamports ---');
    // This sets the default lamports for new accounts
    client.svm.withLamports(1_000_000_000n);
    console.log('Default lamports set to 1 SOL');

    // Enable transaction history
    console.log('\n--- withTransactionHistory ---');
    client.svm.withTransactionHistory(1000n);
    console.log('Transaction history enabled (capacity: 1000)');

    // Set log bytes limit
    console.log('\n--- withLogBytesLimit ---');
    client.svm.withLogBytesLimit(10000n);
    console.log('Log bytes limit set to 10000');

    // Use tap() for inline operations
    console.log('\n--- tap() helper ---');
    const account = await generateKeyPairSigner();

    client.svm.tap(svm => {
        // Do something with the SVM inside the chain
        svm.airdrop(account.address, lamports(5_000_000_000n));
        console.log('Airdropped 5 SOL inside tap()');
    });

    const balance = client.svm.getBalance(account.address);
    console.log('Account balance after tap():', Number(balance ?? 0n) / 1e9, 'SOL');
}

main().catch(console.error);

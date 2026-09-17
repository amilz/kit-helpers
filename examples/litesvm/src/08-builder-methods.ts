/**
 * 08 - Builder Methods
 *
 * This example demonstrates LiteSVM's builder pattern configuration:
 * - All builder methods return LiteSVM for chaining
 * - Configure compute budget, signature verification, and more
 */

import { createClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugin-litesvm';
import { generatedPayer } from '@solana/kit-plugin-payer';

async function main() {
    console.log('=== Builder Methods Example ===\n');

    const client = await createClient().use(generatedPayer()).use(litesvm());

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

    // Fund the account airdrops are paid from
    console.log('\n--- withLamports ---');
    client.svm.withLamports(1_000_000_000_000n);
    console.log('Airdrop source funded with 1000 SOL');

    // Enable transaction history
    console.log('\n--- withTransactionHistory ---');
    client.svm.withTransactionHistory(1000n);
    console.log('Transaction history enabled (capacity: 1000)');

    // Set log bytes limit
    console.log('\n--- withLogBytesLimit ---');
    client.svm.withLogBytesLimit(10000n);
    console.log('Log bytes limit set to 10000');

    console.log('\n--- airdrop ---');
    const account = await generateKeyPairSigner();

    client.svm.airdrop(account.address, lamports(5_000_000_000n));
    console.log('Airdropped 5 SOL');

    const balance = client.svm.getBalance(account.address);
    console.log('Account balance:', Number(balance ?? 0n) / 1e9, 'SOL');
}

main().catch(console.error);

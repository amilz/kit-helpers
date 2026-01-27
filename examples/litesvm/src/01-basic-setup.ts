/**
 * 01 - Basic Setup
 *
 * This example demonstrates basic LiteSVM setup:
 * - Creating a LiteSVM instance
 * - Airdropping SOL to an account
 * - Checking account balance
 */

import { createEmptyClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';
import { assertIsSuccessfulTransaction } from './utils/transaction.js';

async function main() {
    console.log('=== LiteSVM Basic Setup ===\n');

    // Create a client with the litesvm plugin
    // This gives you client.svm (LiteSVM instance) and client.rpc (RPC compatibility layer)
    const client = createEmptyClient().use(litesvm());

    console.log('LiteSVM client created');
    console.log('  - client.svm: LiteSVM instance for direct operations');
    console.log('  - client.rpc: Kit-compatible RPC subset\n');

    // Generate a new keypair for our test account
    const account = await generateKeyPairSigner();
    console.log('Generated account:', account.address);

    // Check initial balance (should be null/0)
    const initialBalance = client.svm.getBalance(account.address);
    console.log('Initial balance:', initialBalance ?? 0n, 'lamports');

    // Airdrop some SOL to the account
    const airdropAmount = lamports(5_000_000_000n); // 5 SOL
    const airdropResult = client.svm.airdrop(account.address, airdropAmount);
    assertIsSuccessfulTransaction(airdropResult);

    console.log('\nAirdrop successful!');
    console.log('  Compute units used:', airdropResult.computeUnitsConsumed());

    // Check the new balance
    const newBalance = client.svm.getBalance(account.address);
    console.log('New balance:', newBalance, 'lamports');
    console.log('New balance:', Number(newBalance ?? 0n) / 1e9, 'SOL');

    // Get the latest blockhash (useful for transactions)
    const blockhash = client.svm.latestBlockhash();
    console.log('\nLatest blockhash:', blockhash);
}

main().catch(console.error);

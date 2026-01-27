/**
 * 10 - RPC Compatibility
 *
 * This example demonstrates the RPC compatibility layer:
 * - getAccountInfo: Fetch single account
 * - getMultipleAccounts: Fetch multiple accounts
 * - getLatestBlockhash: Get current blockhash
 *
 * Note: The RPC layer only supports base64 encoding
 */

import { address, createEmptyClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';

async function main() {
    console.log('=== RPC Compatibility Example ===\n');

    const client = createEmptyClient().use(litesvm());

    // The RPC layer provides a Kit-compatible subset:
    // - getAccountInfo
    // - getMultipleAccounts
    // - getLatestBlockhash
    console.log('Available RPC methods:');
    console.log('  - client.rpc.getAccountInfo()');
    console.log('  - client.rpc.getMultipleAccounts()');
    console.log('  - client.rpc.getLatestBlockhash()');

    // Setup some test accounts
    const account1 = await generateKeyPairSigner();
    const account2 = await generateKeyPairSigner();
    const account3 = await generateKeyPairSigner();

    // Set account data directly
    client.svm.setAccount({
        address: account1.address,
        data: new Uint8Array([1, 2, 3, 4]),
        executable: false,
        lamports: lamports(1_000_000n),
        programAddress: address('11111111111111111111111111111111'),
        space: 4n,
    });

    client.svm.setAccount({
        address: account2.address,
        data: new Uint8Array([5, 6, 7, 8, 9, 10]),
        executable: false,
        lamports: lamports(2_000_000n),
        programAddress: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        space: 6n,
    });

    // account3 intentionally left empty to test null response

    // 1. getAccountInfo - single account
    console.log('\n--- getAccountInfo ---');

    const { value: acc1Info } = await client.rpc.getAccountInfo(account1.address).send();
    console.log('Account 1:');
    if (acc1Info) {
        console.log('  Lamports:', acc1Info.lamports);
        console.log('  Owner:', acc1Info.owner);
        console.log('  Data:', acc1Info.data[0], '(', acc1Info.data[1], ')');
        console.log('  Space:', acc1Info.space);
        console.log('  Executable:', acc1Info.executable);
    }

    // Missing account returns null
    const { value: acc3Info } = await client.rpc.getAccountInfo(account3.address).send();
    console.log('\nAccount 3 (missing):', acc3Info);

    // 2. getMultipleAccounts - batch fetch
    console.log('\n--- getMultipleAccounts ---');

    const { value: multiAccounts } = await client.rpc
        .getMultipleAccounts([account1.address, account2.address, account3.address])
        .send();

    console.log('Batch fetch results:');
    multiAccounts.forEach((acc, i) => {
        if (acc) {
            console.log(`  Account ${i + 1}:`, acc.lamports, 'lamports,', acc.space, 'bytes');
        } else {
            console.log(`  Account ${i + 1}: null (does not exist)`);
        }
    });

    // 3. getLatestBlockhash
    console.log('\n--- getLatestBlockhash ---');

    const { value: blockhashResult } = await client.rpc.getLatestBlockhash({ commitment: 'finalized' }).send();

    console.log('Latest blockhash:');
    console.log('  Blockhash:', blockhashResult.blockhash);
    console.log('  Last valid block height:', blockhashResult.lastValidBlockHeight);

    // Compare with direct SVM access
    const svmBlockhash = client.svm.latestBlockhash();
    console.log('  Via client.svm:', svmBlockhash);
    console.log('  Match:', blockhashResult.blockhash === svmBlockhash);
}

main().catch(console.error);

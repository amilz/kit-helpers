/**
 * 03 - Account Management
 *
 * This example demonstrates account management with LiteSVM:
 * - setAccount: Directly set account state
 * - getAccount: Retrieve account data
 * - getBalance: Get SOL balance
 * - minimumBalanceForRentExemption: Calculate rent-exempt balance
 */

import { address, createEmptyClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';

async function main() {
    console.log('=== Account Management Example ===\n');

    const client = createEmptyClient().use(litesvm());

    // Generate a test account
    const testAccount = await generateKeyPairSigner();
    console.log('Test account:', testAccount.address);

    // Calculate minimum balance for rent exemption
    const dataSize = 100n; // 100 bytes of data
    const minBalance = client.svm.minimumBalanceForRentExemption(dataSize);
    console.log(`\nMinimum balance for ${dataSize} bytes:`, minBalance, 'lamports');
    console.log('  =', Number(minBalance) / 1e9, 'SOL');

    // Set account state directly (no transaction needed!)
    const programId = address('11111111111111111111111111111111');
    const accountData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    client.svm.setAccount({
        address: testAccount.address,
        data: accountData,
        executable: false,
        lamports: lamports(minBalance),
        programAddress: programId,
        space: BigInt(accountData.length),
    });

    console.log('\nAccount state set successfully');

    // Retrieve the account data
    const retrievedAccount = client.svm.getAccount(testAccount.address);

    if (!retrievedAccount.exists) {
        console.log('Account does not exist!');
        return;
    }

    console.log('\nRetrieved account:');
    console.log('  Address:', retrievedAccount.address);
    console.log('  Lamports:', retrievedAccount.lamports);
    console.log('  Owner:', retrievedAccount.programAddress);
    console.log('  Executable:', retrievedAccount.executable);
    console.log('  Data length:', retrievedAccount.data.length, 'bytes');
    console.log('  Data (first 10 bytes):', Array.from(retrievedAccount.data.slice(0, 10)));

    // Get balance separately
    const balance = client.svm.getBalance(testAccount.address);
    console.log('\nBalance via getBalance():', balance, 'lamports');

    // Example: Setting up multiple accounts for testing
    console.log('\n--- Setting up multiple test accounts ---');

    const accounts = await Promise.all(Array.from({ length: 3 }, () => generateKeyPairSigner()));

    for (const [index, account] of accounts.entries()) {
        const customData = new Uint8Array([index, index, index]);
        client.svm.setAccount({
            address: account.address,
            data: customData,
            executable: false,
            lamports: lamports(1_000_000n),
            programAddress: programId,
            space: BigInt(customData.length),
        });
        console.log(`Account ${index}:`, account.address);
    }

    // Verify all accounts
    console.log('\nVerifying accounts:');
    for (const [index, account] of accounts.entries()) {
        const retrieved = client.svm.getAccount(account.address);
        if (retrieved.exists) {
            console.log(`  Account ${index}: data =`, Array.from(retrieved.data));
        }
    }
}

main().catch(console.error);

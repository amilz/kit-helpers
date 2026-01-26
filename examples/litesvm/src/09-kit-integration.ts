/**
 * 09 - Kit Integration
 *
 * This example demonstrates using the litesvm() plugin pattern:
 * - Plugin adds client.svm and client.rpc
 * - RPC provides Kit-compatible interface
 * - Seamless integration with Kit transaction building
 */

import {
    address,
    appendTransactionMessageInstruction,
    createEmptyClient,
    createTransactionMessage,
    generateKeyPairSigner,
    lamports,
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
} from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';
import { getTransferSolInstruction } from '@solana-program/system';
import { assertIsSuccessfulTransaction } from './utils/transaction.js';

async function main() {
    console.log('=== Kit Integration Example ===\n');

    // The litesvm() plugin adds:
    //   - client.svm: Direct LiteSVM access
    //   - client.rpc: Kit-compatible RPC subset
    const client = createEmptyClient().use(litesvm());

    // Configure LiteSVM for testing
    client.svm.withSigverify(false).withBlockhashCheck(false).withSysvars();

    console.log('Client created with litesvm() plugin');
    console.log('  client.svm: LiteSVM instance');
    console.log('  client.rpc: RPC compatibility layer');

    // Setup test accounts
    const payer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();

    // Fund payer via SVM
    client.svm.airdrop(payer.address, lamports(10_000_000_000n));
    console.log('\nPayer funded via client.svm.airdrop()');

    // Use client.rpc just like you would with a real RPC
    console.log('\n--- Using client.rpc ---');

    // Get account info via RPC
    const { value: payerAccount } = await client.rpc.getAccountInfo(payer.address).send();

    console.log('Payer account via RPC:');
    console.log('  Lamports:', payerAccount?.lamports);
    console.log('  Owner:', payerAccount?.owner);
    console.log('  Data encoding:', payerAccount?.data[1]);

    // Get latest blockhash via RPC
    const { value: blockhashInfo } = await client.rpc.getLatestBlockhash().send();
    console.log('\nBlockhash via RPC:', blockhashInfo.blockhash);

    // Build transaction using Kit patterns
    console.log('\n--- Building Transaction with Kit ---');

    const transferIx = getTransferSolInstruction({
        source: payer,
        destination: recipient.address,
        amount: lamports(1_000_000_000n),
    });

    const blockhashLifetime = client.svm.latestBlockhashLifetime();

    const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(payer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhashLifetime, tx),
        tx => appendTransactionMessageInstruction(transferIx, tx),
    );

    const signedTx = await signTransactionMessageWithSigners(transactionMessage);

    // Send via SVM
    const result = client.svm.sendTransaction(signedTx);
    console.log('Transaction sent via client.svm.sendTransaction()');
    assertIsSuccessfulTransaction(result);
    // Note: LiteSVM result properties are getter functions
    console.log('  Signature:', result.signature());
    console.log('  Compute units:', result.computeUnitsConsumed());

    // Verify via RPC
    console.log('\n--- Verifying with RPC ---');

    const { value: accounts } = await client.rpc.getMultipleAccounts([payer.address, recipient.address]).send();

    console.log('Balances via getMultipleAccounts:');
    console.log('  Payer:', accounts[0]?.lamports);
    console.log('  Recipient:', accounts[1]?.lamports);

    // Set account directly, then read via RPC
    console.log('\n--- Direct SVM → RPC Flow ---');

    const customAccount = await generateKeyPairSigner();
    const customData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

    // Set via SVM
    client.svm.setAccount({
        address: customAccount.address,
        data: customData,
        executable: false,
        lamports: lamports(1_000_000n),
        programAddress: address('11111111111111111111111111111111'),
        space: BigInt(customData.length),
    });

    // Read via RPC
    const { value: customAccountInfo } = await client.rpc.getAccountInfo(customAccount.address).send();

    console.log('Custom account set via SVM, read via RPC:');
    console.log('  Data (base64):', customAccountInfo?.data[0]);
    console.log('  Lamports:', customAccountInfo?.lamports);
}

main().catch(console.error);

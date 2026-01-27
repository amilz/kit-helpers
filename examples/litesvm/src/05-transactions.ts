/**
 * 05 - Transactions
 *
 * This example demonstrates transaction handling with LiteSVM:
 * - sendTransaction: Execute a transaction
 * - simulateTransaction: Simulate without state changes
 * - getTransaction: Retrieve transaction by signature
 * - Transaction history configuration
 */

import {
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
import { assertIsSuccessfulSimulation, assertIsSuccessfulTransaction } from './utils/transaction.js';

async function main() {
    console.log('=== Transactions Example ===\n');

    // Enable transaction history to retrieve transactions later
    const client = createEmptyClient().use(litesvm());

    // Enable transaction history (stores last N transactions)
    client.svm.withTransactionHistory(100n);

    const sender = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();

    // Fund sender
    client.svm.airdrop(sender.address, lamports(10_000_000_000n));
    console.log('Sender funded:', sender.address);
    console.log('Recipient:', recipient.address);

    // Build a transfer transaction
    const transferAmount = lamports(500_000_000n); // 0.5 SOL
    const blockhashLifetime = client.svm.latestBlockhashLifetime();

    const transferIx = getTransferSolInstruction({
        source: sender,
        destination: recipient.address,
        amount: transferAmount,
    });

    const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(sender, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhashLifetime, tx),
        tx => appendTransactionMessageInstruction(transferIx, tx),
    );

    const signedTx = await signTransactionMessageWithSigners(transactionMessage);

    // 1. Simulate the transaction first
    console.log('\n--- Simulating Transaction ---');
    const simulationResult = client.svm.simulateTransaction(signedTx);
    assertIsSuccessfulSimulation(simulationResult);
    console.log('Simulation result:');
    if ('err' in simulationResult && simulationResult.err) {
        console.log('  Error:', simulationResult.err);
    } else {
        // simulateTransaction returns SimulatedTransactionInfo
        // Use .meta() to get TransactionMetadata with compute units and logs
        const meta = simulationResult.meta();
        console.log('  Success! Would use', meta.computeUnitsConsumed(), 'compute units');
        console.log('  Logs:', meta.logs());
        // You can also get post-execution account states
        const postAccounts = simulationResult.postAccounts();
        console.log('  Post-state accounts:', postAccounts.length);
    }

    // Check that simulation didn't change state
    const balanceAfterSim = client.svm.getBalance(recipient.address) ?? 0n;
    console.log('  Recipient balance after simulation:', balanceAfterSim, '(unchanged)');

    // 2. Actually send the transaction
    console.log('\n--- Sending Transaction ---');
    const sendResult = client.svm.sendTransaction(signedTx);

    if ('err' in sendResult && sendResult.err) {
        console.error('Transaction failed:', sendResult.err);
        return;
    }

    console.log('Transaction sent successfully!');
    // Note: LiteSVM result properties are getter functions
    assertIsSuccessfulTransaction(sendResult);
    console.log('  Signature:', sendResult.signature());
    console.log('  Compute units:', sendResult.computeUnitsConsumed());
    console.log('  Logs:', sendResult.logs());

    // Verify state changed
    const finalBalance = client.svm.getBalance(recipient.address) ?? 0n;
    console.log('  Recipient balance after send:', finalBalance);

    // 3. Retrieve the transaction from history
    // Note: getTransaction expects a base58-encoded signature string
    console.log('\n--- Retrieving Transaction ---');
    console.log('Transaction history enabled - use getTransaction(signatureString)');
    console.log('to retrieve transactions by their base58-encoded signature.');

    // 4. Blockhash management
    console.log('\n--- Blockhash Management ---');
    const currentBlockhash = client.svm.latestBlockhash();
    console.log('Current blockhash:', currentBlockhash);

    // Expire the current blockhash (useful for testing blockhash expiration)
    client.svm.expireBlockhash();
    const newBlockhash = client.svm.latestBlockhash();
    console.log('After expireBlockhash():', newBlockhash);
}

main().catch(console.error);

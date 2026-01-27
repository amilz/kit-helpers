/**
 * 02 - SOL Transfer
 *
 * This example demonstrates transferring SOL between accounts:
 * - Building a transfer transaction with Kit
 * - Sending the transaction via LiteSVM
 * - Verifying the transfer succeeded
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
    getBase58Decoder,
} from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';
import { getTransferSolInstruction } from '@solana-program/system';
import { assertIsSuccessfulTransaction } from './utils/transaction.js';

async function main() {
    console.log('=== SOL Transfer Example ===\n');

    const client = createEmptyClient().use(litesvm());

    // Create two accounts: sender and recipient
    const sender = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();

    console.log('Sender:', sender.address);
    console.log('Recipient:', recipient.address);

    // Fund the sender with SOL
    const fundAmount = lamports(10_000_000_000n); // 10 SOL
    client.svm.airdrop(sender.address, fundAmount);
    console.log('\nFunded sender with 10 SOL');

    // Check initial balances
    const senderInitial = client.svm.getBalance(sender.address) ?? 0n;
    const recipientInitial = client.svm.getBalance(recipient.address) ?? 0n;
    console.log('Sender balance:', Number(senderInitial) / 1e9, 'SOL');
    console.log('Recipient balance:', Number(recipientInitial) / 1e9, 'SOL');

    // Build the transfer transaction
    const transferAmount = lamports(1_000_000_000n); // 1 SOL
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

    // Sign the transaction
    const signedTx = await signTransactionMessageWithSigners(transactionMessage);

    // Send the transaction
    console.log('\nSending transfer transaction...');
    const result = client.svm.sendTransaction(signedTx);

    if ('err' in result && result.err) {
        console.error('Transaction failed:', result.err);
        return;
    }

    console.log('Transaction successful!');
    // Note: LiteSVM result properties are getter functions
    assertIsSuccessfulTransaction(result);
    console.log('  Compute units used:', result.computeUnitsConsumed());
    console.log('  Signature:', getBase58Decoder().decode(result.signature()));

    // Check final balances
    const senderFinal = client.svm.getBalance(sender.address) ?? 0n;
    const recipientFinal = client.svm.getBalance(recipient.address) ?? 0n;
    console.log('\nFinal balances:');
    console.log('  Sender:', Number(senderFinal) / 1e9, 'SOL (paid transfer + fees)');
    console.log('  Recipient:', Number(recipientFinal) / 1e9, 'SOL');
}

main().catch(console.error);

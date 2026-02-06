import {
    appendTransactionMessageInstructions,
    assertIsFullySignedTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithBlockhashLifetime,
    compileTransaction,
    createTransactionMessage,
    getBase64EncodedWireTransaction,
    getSignatureFromTransaction,
    type Instruction,
    isSolanaError,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    type Signature,
    type SignatureBytes,
    signTransactionMessageWithSigners,
} from '@solana/kit';

import { resolveSigner } from './resolve-signer';
import type {
    ActionClientRequirements,
    ActionNamespace,
    ActionPluginOptions,
    ActionSendOptions,
    ActionSendSignedOptions,
    ActionSignOptions,
    ActionSimulateOptions,
    SignedTransaction,
    SimulateResult,
} from './types';

/**
 * Rethrows SolanaErrors unchanged, wraps other errors with context.
 */
function rethrowWithContext(error: unknown, context: string): never {
    if (isSolanaError(error)) {
        throw error;
    }
    throw new Error(`${context}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
    });
}

/**
 * Build a transaction message from instructions.
 * Fetches latest blockhash, sets fee payer, and appends instructions.
 */
async function buildTransactionMessage(
    client: ActionClientRequirements,
    instructions: Instruction[],
    options?: { abortSignal?: AbortSignal; signer?: import('@solana/kit').TransactionSigner },
) {
    const signer = resolveSigner(client, options?.signer);

    options?.abortSignal?.throwIfAborted();

    let latestBlockhash;
    try {
        const result = await client.rpc.getLatestBlockhash().send({ abortSignal: options?.abortSignal });
        latestBlockhash = result.value;
    } catch (error) {
        rethrowWithContext(error, 'Failed to fetch blockhash');
    }

    options?.abortSignal?.throwIfAborted();

    const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx),
    );

    return { message, signer };
}

/**
 * Creates the action namespace with all action methods.
 * @internal
 */
export function createActionNamespace(
    client: ActionClientRequirements,
    pluginOptions?: ActionPluginOptions,
): ActionNamespace {
    const defaultCommitment = pluginOptions?.commitment ?? 'confirmed';

    return {
        async send(instructions: Instruction[], options?: ActionSendOptions): Promise<Signature> {
            if (instructions.length === 0) {
                throw new Error('Cannot send a transaction with no instructions.');
            }

            options?.abortSignal?.throwIfAborted();

            const { message } = await buildTransactionMessage(client, instructions, {
                abortSignal: options?.abortSignal,
                signer: options?.signer,
            });

            options?.abortSignal?.throwIfAborted();

            let signedTx;
            try {
                signedTx = await signTransactionMessageWithSigners(message);
            } catch (error) {
                rethrowWithContext(error, 'Failed to sign transaction');
            }

            options?.abortSignal?.throwIfAborted();

            // If rpcSubscriptions available, send and confirm
            if ('rpcSubscriptions' in client && client.rpcSubscriptions) {
                assertIsFullySignedTransaction(signedTx);
                assertIsSendableTransaction(signedTx);
                assertIsTransactionWithBlockhashLifetime(signedTx);

                const sendAndConfirm = sendAndConfirmTransactionFactory({
                    rpc: client.rpc,
                    rpcSubscriptions: client.rpcSubscriptions,
                });

                try {
                    await sendAndConfirm(signedTx, {
                        commitment: options?.commitment ?? defaultCommitment,
                        ...(options?.abortSignal && { abortSignal: options.abortSignal }),
                    });
                } catch (error) {
                    rethrowWithContext(error, 'Transaction failed');
                }

                return getSignatureFromTransaction(signedTx);
            }

            // No rpcSubscriptions — fire and forget
            const encodedTransaction = getBase64EncodedWireTransaction(signedTx);

            let signature: Signature;
            try {
                signature = await client.rpc
                    .sendTransaction(encodedTransaction, {
                        encoding: 'base64',
                        skipPreflight: options?.skipPreflight,
                    })
                    .send({ abortSignal: options?.abortSignal });
            } catch (error) {
                rethrowWithContext(error, 'Failed to send transaction');
            }

            return signature;
        },

        async sendSigned(transaction: SignedTransaction, options?: ActionSendSignedOptions): Promise<Signature> {
            options?.abortSignal?.throwIfAborted();

            // If rpcSubscriptions available, send and confirm
            if ('rpcSubscriptions' in client && client.rpcSubscriptions) {
                assertIsFullySignedTransaction(transaction);
                assertIsSendableTransaction(transaction);
                assertIsTransactionWithBlockhashLifetime(transaction);

                const sendAndConfirm = sendAndConfirmTransactionFactory({
                    rpc: client.rpc,
                    rpcSubscriptions: client.rpcSubscriptions,
                });

                try {
                    await sendAndConfirm(transaction, {
                        commitment: options?.commitment ?? defaultCommitment,
                        ...(options?.abortSignal && { abortSignal: options.abortSignal }),
                    });
                } catch (error) {
                    rethrowWithContext(error, 'Transaction failed');
                }

                return getSignatureFromTransaction(transaction);
            }

            // No rpcSubscriptions — fire and forget
            const encodedTransaction = getBase64EncodedWireTransaction(transaction);

            let signature: Signature;
            try {
                signature = await client.rpc
                    .sendTransaction(encodedTransaction, {
                        encoding: 'base64',
                        skipPreflight: options?.skipPreflight,
                    })
                    .send({ abortSignal: options?.abortSignal });
            } catch (error) {
                rethrowWithContext(error, 'Failed to send transaction');
            }

            return signature;
        },

        async sign(instructions: Instruction[], options?: ActionSignOptions): Promise<SignedTransaction> {
            if (instructions.length === 0) {
                throw new Error('Cannot sign a transaction with no instructions.');
            }

            options?.abortSignal?.throwIfAborted();

            const { message } = await buildTransactionMessage(client, instructions, {
                abortSignal: options?.abortSignal,
                signer: options?.signer,
            });

            options?.abortSignal?.throwIfAborted();

            let signedTx;
            try {
                signedTx = await signTransactionMessageWithSigners(message);
            } catch (error) {
                rethrowWithContext(error, 'Failed to sign transaction');
            }

            return signedTx as SignedTransaction;
        },

        async signMessage(message: Uint8Array): Promise<SignatureBytes> {
            // Try wallet session signMessage
            if ('wallet' in client && client.wallet.connected && client.wallet.state?.session?.signMessage) {
                return await client.wallet.state.session.signMessage(message);
            }

            // Try payer's signMessages (available on KeyPairSigner)
            if ('payer' in client && client.payer) {
                const signer = client.payer as Record<string, unknown>;
                if (typeof signer.signMessages === 'function') {
                    // signMessages expects { content: Uint8Array }[] and returns { [address]: SignatureBytes }[]
                    const results = await (
                        signer.signMessages as (
                            msgs: { content: Uint8Array }[],
                        ) => Promise<Record<string, SignatureBytes>[]>
                    )([{ content: message }]);
                    const sigDict = results[0];
                    const sigBytes = Object.values(sigDict)[0];
                    return sigBytes;
                }
            }

            throw new Error(
                'No signMessage capability available. Connect a wallet with signMessage support, ' +
                    'or use a KeyPairSigner as the payer.',
            );
        },

        async simulate(instructions: Instruction[], options?: ActionSimulateOptions): Promise<SimulateResult> {
            if (instructions.length === 0) {
                throw new Error('Cannot simulate a transaction with no instructions.');
            }

            options?.abortSignal?.throwIfAborted();

            const { message } = await buildTransactionMessage(client, instructions, {
                abortSignal: options?.abortSignal,
                signer: options?.signer,
            });

            options?.abortSignal?.throwIfAborted();

            const compiled = compileTransaction(message);
            const encodedTransaction = getBase64EncodedWireTransaction(compiled);

            let result;
            try {
                result = await client.rpc
                    .simulateTransaction(encodedTransaction, {
                        commitment: 'confirmed',
                        encoding: 'base64',
                    })
                    .send({ abortSignal: options?.abortSignal });
            } catch (error) {
                rethrowWithContext(error, 'Failed to simulate transaction');
            }

            const error = result.value.err ? JSON.stringify(result.value.err) : null;

            return Object.freeze({
                error,
                logs: result.value.logs ?? null,
                returnData:
                    result.value.returnData && result.value.returnData.data.length > 0
                        ? {
                              data: result.value.returnData.data[0],
                              programId: result.value.returnData.programId,
                          }
                        : null,
                unitsConsumed: result.value.unitsConsumed ?? null,
            });
        },
    };
}

import { createSignMessageFromAccount, supportsTransactionVersion } from '@kit-helpers/wallet';
import {
    getSetComputeUnitLimitInstruction,
    getSetComputeUnitPriceInstruction,
    MAX_COMPUTE_UNIT_LIMIT,
} from '@solana-program/compute-budget';
import {
    appendTransactionMessageInstructions,
    assertIsFullySignedTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithBlockhashLifetime,
    compileTransaction,
    createTransactionMessage,
    estimateAndSetResourceLimitsFactory,
    estimateResourceLimitsFactory,
    fillTransactionMessageProvisoryResourceLimits,
    getBase64EncodedWireTransaction,
    getSignatureFromTransaction,
    type Instruction,
    isSolanaError,
    type MicroLamports,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageComputeUnitLimit,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    setTransactionMessageLoadedAccountsDataSizeLimit,
    setTransactionMessagePriorityFeeLamports,
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
    ActionTransactionVersion,
    SignedTransaction,
    SimulateResult,
} from './types';

/** The largest loaded accounts data size limit the runtime accepts, in bytes. */
const MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT = 64 * 1024 * 1024;

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
 * On version 1, resource limits left unset are estimated via simulation, or
 * filled with the maximums when `estimateResourceLimits` is false.
 */
async function buildTransactionMessage(
    client: ActionClientRequirements,
    instructions: Instruction[],
    options?: {
        abortSignal?: AbortSignal;
        computeUnitLimit?: number;
        computeUnitPrice?: bigint;
        estimateResourceLimits?: boolean;
        loadedAccountsDataSizeLimit?: number;
        priorityFeeLamports?: bigint;
        signer?: import('@solana/kit').TransactionSigner;
        version?: ActionTransactionVersion;
    },
) {
    const signer = resolveSigner(client, options?.signer);
    const version = resolveVersion(client, options?.version);

    options?.abortSignal?.throwIfAborted();

    let latestBlockhash;
    try {
        const result = await client.rpc.getLatestBlockhash().send({ abortSignal: options?.abortSignal });
        latestBlockhash = result.value;
    } catch (error) {
        rethrowWithContext(error, 'Failed to fetch blockhash');
    }

    options?.abortSignal?.throwIfAborted();

    if (version === 1 && options?.computeUnitPrice !== undefined) {
        throw new Error(
            'computeUnitPrice prices priority per compute unit, which version 1 transactions do not ' +
                'do. Use priorityFeeLamports to state a total in lamports, or build as version 0.',
        );
    }
    if (version === 0 && options?.priorityFeeLamports !== undefined) {
        throw new Error(
            'priorityFeeLamports states a total priority fee, which only version 1 transactions ' +
                'carry. Use computeUnitPrice to state a price per compute unit, or build as version 1.',
        );
    }

    if (version === 1) {
        const message = pipe(
            createTransactionMessage({ version: 1 }),
            tx => setTransactionMessageFeePayerSigner(signer, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            tx => appendTransactionMessageInstructions(instructions, tx),
            tx => setTransactionMessageComputeUnitLimit(options?.computeUnitLimit, tx),
            tx => setTransactionMessageLoadedAccountsDataSizeLimit(options?.loadedAccountsDataSizeLimit, tx),
            tx => setTransactionMessagePriorityFeeLamports(options?.priorityFeeLamports, tx),
        );

        if (options?.computeUnitLimit !== undefined && options?.loadedAccountsDataSizeLimit !== undefined) {
            return { message, signer };
        }

        if (options?.estimateResourceLimits === false) {
            return {
                message: pipe(
                    message,
                    tx =>
                        setTransactionMessageComputeUnitLimit(options?.computeUnitLimit ?? MAX_COMPUTE_UNIT_LIMIT, tx),
                    tx =>
                        setTransactionMessageLoadedAccountsDataSizeLimit(
                            options?.loadedAccountsDataSizeLimit ?? MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT,
                            tx,
                        ),
                ),
                signer,
            };
        }

        const estimateAndSetResourceLimits = estimateAndSetResourceLimitsFactory(
            estimateResourceLimitsFactory({ rpc: client.rpc }),
        );
        try {
            const estimated = await estimateAndSetResourceLimits(
                fillTransactionMessageProvisoryResourceLimits(message),
                {
                    ...(options?.abortSignal && { abortSignal: options.abortSignal }),
                    commitment: 'confirmed',
                },
            );
            return { message: estimated, signer };
        } catch (error) {
            rethrowWithContext(error, 'Failed to estimate resource limits');
        }
    }

    const allInstructions: Instruction[] = [];
    if (options?.computeUnitLimit !== undefined) {
        allInstructions.push(getSetComputeUnitLimitInstruction({ units: options.computeUnitLimit }));
    }
    if (options?.computeUnitPrice !== undefined) {
        allInstructions.push(
            getSetComputeUnitPriceInstruction({ microLamports: options.computeUnitPrice as MicroLamports }),
        );
    }
    allInstructions.push(...instructions);

    const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(allInstructions, tx),
    );

    return { message, signer };
}

/**
 * Decides which transaction version to build. An explicit version the connected
 * wallet cannot sign throws; the default falls back to version 0 for such a wallet.
 */
function resolveVersion(
    client: ActionClientRequirements,
    requested: ActionTransactionVersion | undefined,
): ActionTransactionVersion {
    const version = requested ?? 1;

    if (version === 0 || !('wallet' in client) || client.wallet.state.status !== 'connected') {
        return version;
    }

    const { wallet } = client.wallet.state.session;
    if (supportsTransactionVersion(wallet, version)) {
        return version;
    }

    if (requested === undefined) {
        return 0;
    }

    const advertised = client.wallet.supportedTransactionVersions;
    throw new Error(
        `Wallet "${wallet.name}" does not sign version ${version} transactions. ` +
            `It advertises support for: ${advertised.length > 0 ? advertised.join(', ') : 'no versions'}.`,
    );
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
                computeUnitLimit: options?.computeUnitLimit ?? pluginOptions?.computeUnitLimit,
                computeUnitPrice: options?.computeUnitPrice ?? pluginOptions?.computeUnitPrice,
                loadedAccountsDataSizeLimit:
                    options?.loadedAccountsDataSizeLimit ?? pluginOptions?.loadedAccountsDataSizeLimit,
                priorityFeeLamports: options?.priorityFeeLamports ?? pluginOptions?.priorityFeeLamports,
                signer: options?.signer,
                version: options?.version ?? pluginOptions?.version,
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
                computeUnitLimit: options?.computeUnitLimit ?? pluginOptions?.computeUnitLimit,
                computeUnitPrice: options?.computeUnitPrice ?? pluginOptions?.computeUnitPrice,
                loadedAccountsDataSizeLimit:
                    options?.loadedAccountsDataSizeLimit ?? pluginOptions?.loadedAccountsDataSizeLimit,
                priorityFeeLamports: options?.priorityFeeLamports ?? pluginOptions?.priorityFeeLamports,
                signer: options?.signer,
                version: options?.version ?? pluginOptions?.version,
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
            // Try wallet session — create signMessage from account
            if ('wallet' in client && client.wallet.state.status === 'connected') {
                const signMsg = createSignMessageFromAccount(client.wallet.state.session.account);
                return await signMsg(message);
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
                computeUnitLimit: options?.computeUnitLimit ?? pluginOptions?.computeUnitLimit,
                computeUnitPrice: options?.computeUnitPrice ?? pluginOptions?.computeUnitPrice,
                estimateResourceLimits: false,
                loadedAccountsDataSizeLimit:
                    options?.loadedAccountsDataSizeLimit ?? pluginOptions?.loadedAccountsDataSizeLimit,
                priorityFeeLamports: options?.priorityFeeLamports ?? pluginOptions?.priorityFeeLamports,
                signer: options?.signer,
                version: options?.version ?? pluginOptions?.version,
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

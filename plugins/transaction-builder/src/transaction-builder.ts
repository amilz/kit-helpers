import {
    estimateComputeUnitLimitFactory,
    getSetComputeUnitLimitInstruction,
    getSetComputeUnitPriceInstruction,
    MAX_COMPUTE_UNIT_LIMIT,
} from '@solana-program/compute-budget';
import {
    appendTransactionMessageInstructionPlan,
    appendTransactionMessageInstructions,
    assertIsFullySignedTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithBlockhashLifetime,
    assertIsTransactionWithDurableNonceLifetime,
    type Commitment,
    compileTransaction,
    createTransactionMessage,
    estimateAndSetResourceLimitsFactory,
    estimateResourceLimitsFactory,
    fillTransactionMessageProvisoryResourceLimits,
    getBase64EncodedWireTransaction,
    getSignatureFromTransaction,
    type Instruction,
    InstructionPlan,
    isSolanaError,
    type MicroLamports,
    pipe,
    sendAndConfirmDurableNonceTransactionFactory,
    sendAndConfirmTransactionFactory,
    setTransactionMessageComputeUnitLimit,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    setTransactionMessageLifetimeUsingDurableNonce,
    setTransactionMessageLoadedAccountsDataSizeLimit,
    setTransactionMessagePriorityFeeLamports,
    type Signature,
    signTransactionMessageWithSigners,
    SOLANA_ERROR__INVALID_NONCE,
} from '@solana/kit';

import type {
    BuilderState,
    NonceConfig,
    SendOptions,
    SignableTransactionMessage,
    SignedTransaction,
    SimulateResult,
    TransactionBuilderBuilding,
    TransactionBuilderClientRequirements,
    TransactionBuilderOptions,
    TransactionBuilderPrepared,
    TransactionBuilderSigned,
} from './types';

/** The largest loaded accounts data size limit the runtime accepts, in bytes. */
const MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT = 64 * 1024 * 1024;

/** The granularity in bytes at which the runtime charges for loaded account data. */
const LOADED_ACCOUNTS_DATA_PAGE_SIZE = 32 * 1024;

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
 * Verifies if a transaction signature has been confirmed by polling getSignatureStatuses.
 * Used to work around Solana Kit's durable nonce race condition where INVALID_NONCE
 * may be thrown even when the transaction actually succeeded.
 * Issue opened: https://github.com/anza-xyz/kit/issues/1211
 */
async function verifySignatureConfirmed(
    rpc: TransactionBuilderClientRequirements['rpc'],
    signature: Signature,
    commitment: Commitment,
    abortSignal?: AbortSignal,
): Promise<boolean> {
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        abortSignal?.throwIfAborted();

        let response;
        try {
            response = await rpc.getSignatureStatuses([signature]).send({ abortSignal });
        } catch {
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                continue;
            }
            return false;
        }
        const status = response.value[0];

        if (status) {
            if (status.err) {
                return false;
            }

            const confirmationStatus = status.confirmationStatus;
            if (confirmationStatus === 'finalized') {
                return true;
            }
            if (confirmationStatus === 'confirmed' && commitment !== 'finalized') {
                return true;
            }
            if (confirmationStatus === 'processed' && commitment === 'processed') {
                return true;
            }
        }

        if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    return false;
}

/** Applies either a blockhash or a durable nonce lifetime to a transaction message. */
type LifetimeSetter = <T extends Parameters<typeof setTransactionMessageFeePayerSigner>[1]>(
    tx: T,
) =>
    | ReturnType<typeof setTransactionMessageLifetimeUsingBlockhash<T>>
    | ReturnType<typeof setTransactionMessageLifetimeUsingDurableNonce<T>>;

/**
 * Builds a version 1 transaction message, estimating whichever resource limits were not set.
 *
 * Version 1 carries the compute unit limit, the loaded accounts data size limit
 * and the priority fee in the message config, so no ComputeBudget instructions
 * are appended. Both limits default to zero when unset.
 */
async function prepareV1Message(
    state: BuilderState,
    setLifetime: LifetimeSetter,
    abortSignal?: AbortSignal,
): Promise<SignableTransactionMessage> {
    const message = pipe(
        createTransactionMessage({ version: 1 }),
        tx => setTransactionMessageFeePayerSigner(state.client.payer, tx),
        tx => setLifetime(tx),
        tx => appendTransactionMessageInstructions(state.instructions, tx),
        tx => setTransactionMessageComputeUnitLimit(state.computeUnitLimit, tx),
        tx => setTransactionMessageLoadedAccountsDataSizeLimit(state.loadedAccountsDataSizeLimit, tx),
        tx => setTransactionMessagePriorityFeeLamports(state.priorityFeeLamports, tx),
    );

    if (state.computeUnitLimit !== undefined && state.loadedAccountsDataSizeLimit !== undefined) {
        return message;
    }

    if (!state.autoEstimateCus) {
        throw new Error(
            'Version 1 transactions must declare both a compute unit limit and a loaded accounts ' +
                'data size limit, because each defaults to zero rather than to a runtime default. ' +
                'Call setComputeLimit() and setLoadedAccountsDataSizeLimit(), or enable ' +
                'auto-estimation to have both measured by simulation.',
        );
    }

    const estimateAndSetResourceLimits = estimateAndSetResourceLimitsFactory(
        withResourceLimitMargin(estimateResourceLimitsFactory({ rpc: state.client.rpc }), state.estimateMargin),
    );

    try {
        return await estimateAndSetResourceLimits(fillTransactionMessageProvisoryResourceLimits(message), {
            ...(abortSignal && { abortSignal }),
            commitment: 'confirmed',
        });
    } catch (error) {
        if (isSolanaError(error)) {
            throw error;
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Failed to estimate resource limits: ${reason}. ` +
                'Consider using setComputeLimit() and setLoadedAccountsDataSizeLimit() to set ' +
                'manual limits, or autoEstimateCus(false) to disable estimation.',
            { cause: error },
        );
    }
}

/**
 * Adds headroom to a simulated estimate: `margin` on the compute unit limit,
 * and a round-up to a whole page on the loaded accounts data size limit.
 */
function withResourceLimitMargin(
    estimateResourceLimits: ReturnType<typeof estimateResourceLimitsFactory>,
    margin: number,
): ReturnType<typeof estimateResourceLimitsFactory> {
    return (async (message, config) => {
        const estimate = await estimateResourceLimits(message, config);
        const withMargin: { computeUnitLimit: number; loadedAccountsDataSizeLimit?: number } = {
            ...estimate,
            computeUnitLimit: Math.min(Math.ceil(estimate.computeUnitLimit * (1 + margin)), MAX_COMPUTE_UNIT_LIMIT),
        };
        if (estimate.loadedAccountsDataSizeLimit !== undefined) {
            withMargin.loadedAccountsDataSizeLimit = Math.min(
                Math.ceil(estimate.loadedAccountsDataSizeLimit / LOADED_ACCOUNTS_DATA_PAGE_SIZE) *
                    LOADED_ACCOUNTS_DATA_PAGE_SIZE,
                MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT,
            );
        }
        return withMargin;
    }) as ReturnType<typeof estimateResourceLimitsFactory>;
}

/**
 * Creates a new transaction builder for the given client.
 *
 * @param client - The client with rpc, feePayer, and optional rpcSubscriptions.
 * @param options - Optional configuration for default behavior.
 * @returns A transaction builder in the Building state.
 *
 * @example
 * ```ts
 * const signature = await createTransactionBuilder(client)
 *   .add(transferInstruction)
 *   .setComputeLimit(200_000)
 *   .setPriorityFeeLamports(5_000n)
 *   .prepare()
 *   .then(b => b.sign())
 *   .then(b => b.sendAndConfirm({ commitment: 'confirmed' }));
 * ```
 *
 * @example
 * Building a version 0 transaction.
 * ```ts
 * const signature = await createTransactionBuilder(client, { version: 0 })
 *   .add(transferInstruction)
 *   .setPriorityFee(1_000_000n)
 *   .execute();
 * ```
 */
export function createTransactionBuilder(
    client: TransactionBuilderClientRequirements,
    options?: TransactionBuilderOptions,
): TransactionBuilderBuilding {
    const version = options?.version ?? 1;
    const minFee = options?.minPriorityFee;
    const minFeeLamports = options?.minPriorityFeeLamports;

    if (version === 1 && minFee !== undefined) {
        throw new Error(
            'minPriorityFee prices priority per compute unit, which version 1 transactions do not ' +
                'do. Use minPriorityFeeLamports to state a total in lamports, or pass version: 0.',
        );
    }
    if (version === 0 && minFeeLamports !== undefined) {
        throw new Error(
            'minPriorityFeeLamports states a total priority fee, which only version 1 transactions ' +
                'carry. Use minPriorityFee to state a price per compute unit, or pass version: 1.',
        );
    }

    const state: BuilderState = Object.freeze({
        autoEstimateCus: options?.autoEstimateCus ?? true,
        client,
        computeUnitPrice: minFee && minFee > 0n ? minFee : undefined,
        estimateMargin: options?.estimateMargin ?? 0.1,
        instructions: [],
        priorityFeeLamports: minFeeLamports && minFeeLamports > 0n ? minFeeLamports : undefined,
        version,
    });
    return createBuildingBuilder(state);
}

function createBuildingBuilder(state: BuilderState): TransactionBuilderBuilding {
    return Object.freeze({
        _state(): BuilderState {
            return state;
        },

        add(instruction: Instruction): TransactionBuilderBuilding {
            return this.addMany([instruction]);
        },

        addMany(instructions: readonly Instruction[]): TransactionBuilderBuilding {
            const newState: BuilderState = Object.freeze({
                ...state,
                instructions: [...state.instructions, ...instructions],
            });
            return createBuildingBuilder(newState);
        },

        addPlan(instructionPlan: InstructionPlan): TransactionBuilderBuilding {
            const tempMessage = pipe(createTransactionMessage({ version: 0 }), tx =>
                setTransactionMessageFeePayerSigner(state.client.payer, tx),
            );
            const withPlan = appendTransactionMessageInstructionPlan(instructionPlan, tempMessage);
            return this.addMany(withPlan.instructions);
        },

        autoEstimateCus(enabled: boolean): TransactionBuilderBuilding {
            const newState: BuilderState = Object.freeze({
                ...state,
                autoEstimateCus: enabled,
            });
            return createBuildingBuilder(newState);
        },

        async execute(options?: SendOptions): Promise<string> {
            const prepared = await this.prepare({ abortSignal: options?.abortSignal });
            const signed = await prepared.sign({ abortSignal: options?.abortSignal });
            return await signed.sendAndConfirm(options);
        },

        async prepare(config?: { abortSignal?: AbortSignal }): Promise<TransactionBuilderPrepared> {
            config?.abortSignal?.throwIfAborted();

            if (state.instructions.length === 0) {
                throw new Error(
                    'Cannot prepare transaction with no instructions. ' +
                        'Add at least one instruction using add() or addMany().',
                );
            }

            // Build initial instructions (priority fee + user instructions)
            const baseInstructions: Instruction[] = [];

            if (state.computeUnitPrice !== undefined && state.computeUnitPrice > 0n) {
                baseInstructions.push(
                    getSetComputeUnitPriceInstruction({
                        microLamports: state.computeUnitPrice as MicroLamports,
                    }),
                );
            }
            baseInstructions.push(...state.instructions);

            let setLifetime: LifetimeSetter;

            if (state.nonceConfig) {
                // Use durable nonce - no blockhash fetch needed
                setLifetime = tx => setTransactionMessageLifetimeUsingDurableNonce(state.nonceConfig!, tx);
            } else {
                // Fetch latest blockhash
                let latestBlockhash;
                try {
                    const result = await state.client.rpc
                        .getLatestBlockhash()
                        .send({ abortSignal: config?.abortSignal });
                    latestBlockhash = result.value;
                } catch (error) {
                    rethrowWithContext(error, 'Failed to fetch blockhash');
                }
                setLifetime = tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx);
            }

            config?.abortSignal?.throwIfAborted();

            if (state.version === 1) {
                const message = await prepareV1Message(state, setLifetime, config?.abortSignal);
                return createPreparedBuilder(state.client, message, state.nonceConfig);
            }

            // Helper to build the transaction message with given instructions
            const buildMessage = (instructions: Instruction[]): SignableTransactionMessage =>
                pipe(
                    createTransactionMessage({ version: 0 }),
                    tx => setTransactionMessageFeePayerSigner(state.client.payer, tx),
                    tx => setLifetime(tx),
                    tx => appendTransactionMessageInstructions(instructions, tx),
                );

            // Handle compute unit limit: manual > auto-estimate > none
            // Note: Compute budget instructions must be placed at the start of the
            // transaction. The Solana runtime requires them to appear before any
            // other instructions to take effect.
            if (state.computeUnitLimit !== undefined) {
                // Manual CU limit - use as-is
                const instructions = [
                    getSetComputeUnitLimitInstruction({ units: state.computeUnitLimit }),
                    ...baseInstructions,
                ];
                return createPreparedBuilder(state.client, buildMessage(instructions), state.nonceConfig);
            }

            if (state.autoEstimateCus) {
                // Auto-estimate: build provisory message, simulate, get estimate, apply margin
                const estimateComputeUnitLimit = estimateComputeUnitLimitFactory({
                    rpc: state.client.rpc,
                });

                let rawEstimate: number;
                try {
                    rawEstimate = await estimateComputeUnitLimit(buildMessage(baseInstructions));
                } catch (error) {
                    if (isSolanaError(error)) {
                        throw error;
                    }
                    const message = error instanceof Error ? error.message : String(error);
                    throw new Error(
                        `Failed to estimate compute units: ${message}. ` +
                            'Consider using setComputeLimit() to set a manual limit, ' +
                            'or autoEstimateCus(false) to disable estimation.',
                        { cause: error },
                    );
                }

                // Apply margin and cap to Solana's max CU limit
                const estimatedLimit = Math.min(
                    Math.ceil(rawEstimate * (1 + state.estimateMargin)),
                    MAX_COMPUTE_UNIT_LIMIT,
                );
                const instructions = [
                    getSetComputeUnitLimitInstruction({ units: estimatedLimit }),
                    ...baseInstructions,
                ];
                return createPreparedBuilder(state.client, buildMessage(instructions), state.nonceConfig);
            }

            // No CU limit instruction
            return createPreparedBuilder(state.client, buildMessage(baseInstructions), state.nonceConfig);
        },

        setComputeLimit(units: number): TransactionBuilderBuilding {
            if (!Number.isInteger(units) || units <= 0 || units > MAX_COMPUTE_UNIT_LIMIT) {
                throw new Error(
                    `Invalid compute unit limit: ${units}. ` +
                        `Must be a positive integer <= ${MAX_COMPUTE_UNIT_LIMIT.toLocaleString()}.`,
                );
            }
            const newState: BuilderState = Object.freeze({
                ...state,
                computeUnitLimit: units,
            });
            return createBuildingBuilder(newState);
        },

        setEstimateMargin(margin: number): TransactionBuilderBuilding {
            if (margin < 0) {
                throw new Error(`Invalid estimate margin: ${margin}. Must be >= 0.`);
            }
            const newState: BuilderState = Object.freeze({
                ...state,
                estimateMargin: margin,
            });
            return createBuildingBuilder(newState);
        },

        setLoadedAccountsDataSizeLimit(bytes: number): TransactionBuilderBuilding {
            if (state.version === 0) {
                throw new Error(
                    'setLoadedAccountsDataSizeLimit() sets a limit that only version 1 transactions ' +
                        'carry in the message. Build the transaction as version 1 to set it.',
                );
            }
            if (!Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT) {
                throw new Error(
                    `Invalid loaded accounts data size limit: ${bytes}. ` +
                        `Must be a positive integer <= ${MAX_LOADED_ACCOUNTS_DATA_SIZE_LIMIT.toLocaleString()}.`,
                );
            }
            const newState: BuilderState = Object.freeze({
                ...state,
                loadedAccountsDataSizeLimit: bytes,
            });
            return createBuildingBuilder(newState);
        },

        setPriorityFee(microLamports: bigint): TransactionBuilderBuilding {
            if (state.version === 1) {
                throw new Error(
                    'setPriorityFee() prices priority per compute unit, which version 1 transactions ' +
                        'do not do. Use setPriorityFeeLamports() to state a total in lamports, or ' +
                        'build the transaction as version 0.',
                );
            }
            if (microLamports < 0n) {
                throw new Error(`Invalid priority fee: ${microLamports}. Must be >= 0.`);
            }
            const newState: BuilderState = Object.freeze({
                ...state,
                computeUnitPrice: microLamports,
            });
            return createBuildingBuilder(newState);
        },

        setPriorityFeeLamports(lamports: bigint): TransactionBuilderBuilding {
            if (state.version === 0) {
                throw new Error(
                    'setPriorityFeeLamports() states a total priority fee, which only version 1 ' +
                        'transactions carry. Use setPriorityFee() to state a price per compute unit, ' +
                        'or build the transaction as version 1.',
                );
            }
            if (lamports < 0n) {
                throw new Error(`Invalid priority fee: ${lamports}. Must be >= 0.`);
            }
            const newState: BuilderState = Object.freeze({
                ...state,
                priorityFeeLamports: lamports,
            });
            return createBuildingBuilder(newState);
        },

        useNonce(config: NonceConfig): TransactionBuilderBuilding {
            const newState: BuilderState = Object.freeze({
                ...state,
                nonceConfig: config,
            });
            return createBuildingBuilder(newState);
        },
    });
}

function createPreparedBuilder(
    client: TransactionBuilderClientRequirements,
    message: SignableTransactionMessage,
    nonceConfig?: NonceConfig,
): TransactionBuilderPrepared {
    return Object.freeze({
        getMessage() {
            return message;
        },

        async sign(config?: { abortSignal?: AbortSignal }): Promise<TransactionBuilderSigned> {
            config?.abortSignal?.throwIfAborted();

            let transaction;
            try {
                transaction = await signTransactionMessageWithSigners(message);
            } catch (error) {
                rethrowWithContext(error, 'Failed to sign transaction');
            }

            config?.abortSignal?.throwIfAborted();

            return createSignedBuilder(client, transaction, nonceConfig);
        },

        async simulate(config?: { abortSignal?: AbortSignal; throwOnError?: boolean }): Promise<SimulateResult> {
            config?.abortSignal?.throwIfAborted();

            // Compile the transaction for simulation
            const compiled = compileTransaction(message);
            const encodedTransaction = getBase64EncodedWireTransaction(compiled);

            let result;
            try {
                result = await client.rpc
                    .simulateTransaction(encodedTransaction, {
                        commitment: 'confirmed',
                        encoding: 'base64',
                    })
                    .send({ abortSignal: config?.abortSignal });
            } catch (error) {
                rethrowWithContext(error, 'Failed to simulate transaction');
            }

            const error = result.value.err ? JSON.stringify(result.value.err) : null;

            if (config?.throwOnError && error) {
                throw new Error(`Simulation failed: ${error}`);
            }

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
    });
}

function createSignedBuilder(
    client: TransactionBuilderClientRequirements,
    transaction: SignedTransaction,
    nonceConfig?: NonceConfig,
): TransactionBuilderSigned {
    return Object.freeze({
        getTransaction() {
            return transaction;
        },

        async send(options?: SendOptions): Promise<string> {
            options?.abortSignal?.throwIfAborted();

            const encodedTransaction = getBase64EncodedWireTransaction(transaction);

            let signature;
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

        async sendAndConfirm(options?: SendOptions): Promise<string> {
            options?.abortSignal?.throwIfAborted();

            if (!client.rpcSubscriptions) {
                throw new Error(
                    'sendAndConfirm requires rpcSubscriptions on the client. ' +
                        'Use send() instead or provide rpcSubscriptions.',
                );
            }

            assertIsFullySignedTransaction(transaction);
            assertIsSendableTransaction(transaction);

            const confirmOptions = {
                commitment: options?.commitment ?? 'confirmed',
                ...(options?.abortSignal && { abortSignal: options.abortSignal }),
            };

            try {
                if (nonceConfig) {
                    assertIsTransactionWithDurableNonceLifetime(transaction);
                    const sendAndConfirm = sendAndConfirmDurableNonceTransactionFactory({
                        rpc: client.rpc,
                        rpcSubscriptions: client.rpcSubscriptions,
                    });
                    const signature = getSignatureFromTransaction(transaction);
                    try {
                        await sendAndConfirm(transaction, confirmOptions);
                    } catch (nonceError) {
                        // Workaround for Solana Kit race condition:
                        // sendAndConfirmDurableNonceTransaction may throw INVALID_NONCE
                        // when the nonce advances (indicating success) before the signature
                        // confirmation completes. Verify actual status before failing.
                        if (isSolanaError(nonceError, SOLANA_ERROR__INVALID_NONCE)) {
                            const confirmed = await verifySignatureConfirmed(
                                client.rpc,
                                signature,
                                confirmOptions.commitment,
                                options?.abortSignal,
                            );
                            if (confirmed) {
                                return signature;
                            }
                        }
                        throw nonceError;
                    }
                    return signature;
                } else {
                    assertIsTransactionWithBlockhashLifetime(transaction);
                    const sendAndConfirm = sendAndConfirmTransactionFactory({
                        rpc: client.rpc,
                        rpcSubscriptions: client.rpcSubscriptions,
                    });
                    await sendAndConfirm(transaction, confirmOptions);
                    return getSignatureFromTransaction(transaction);
                }
            } catch (error) {
                rethrowWithContext(error, 'Transaction failed');
            }
        },
    });
}

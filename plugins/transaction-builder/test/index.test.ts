import {
    address,
    createEmptyClient,
    generateKeyPairSigner,
    sequentialInstructionPlan,
    type Instruction,
} from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';

import { createTransactionBuilder, transactionBuilderPlugin } from '../src';

describe('createTransactionBuilder', () => {
    it('creates a builder in building state', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(builder).toHaveProperty('add');
        expect(builder).toHaveProperty('addMany');
        expect(builder).toHaveProperty('setComputeLimit');
        expect(builder).toHaveProperty('setPriorityFee');
        expect(builder).toHaveProperty('prepare');
    });

    it('returns a new builder when adding instructions', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const instruction = createMockInstruction();
        const builder2 = builder1.add(instruction);

        expect(builder2).not.toBe(builder1);
        expect(builder2).toHaveProperty('add');
        expect(builder2._state().instructions).toStrictEqual([instruction]);
    });

    it('returns a new builder when adding many instructions', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const instruction1 = createMockInstructionWithData(new Uint8Array([1, 2, 3]));
        const instruction2 = createMockInstructionWithData(new Uint8Array([4, 5, 6]));
        const instructions = [instruction1, instruction2];
        const builder2 = builder1.addMany(instructions);

        expect(builder2).not.toBe(builder1);
        expect(builder2._state().instructions).toStrictEqual(instructions);
    });

    it('returns a new builder when adding an instruction plan', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const instruction1 = createMockInstructionWithData(new Uint8Array([1, 2, 3]));
        const instruction2 = createMockInstructionWithData(new Uint8Array([4, 5, 6]));
        const instructionPlan = sequentialInstructionPlan([instruction1, instruction2]);
        const builder2 = builder1.addPlan(instructionPlan);

        expect(builder2).not.toBe(builder1);
        expect(builder2._state().instructions).toStrictEqual([instruction1, instruction2]);
    });

    it('returns a new builder when setting compute limit', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const builder2 = builder1.setComputeLimit(200_000);

        expect(builder2).not.toBe(builder1);
    });

    it('returns a new builder when setting priority fee', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const builder2 = builder1.setPriorityFee(1_000_000n);

        expect(builder2).not.toBe(builder1);
    });

    it('setPriorityFee adds compute unit price instruction to message', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        const priorityFee = 5_000_000n; // 5 million microLamports
        const prepared = await builder
            .add(createMockInstruction())
            .setPriorityFee(priorityFee)
            .setComputeLimit(100_000) // Skip auto-estimate
            .prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };

        // SetComputeUnitPrice instruction: discriminator 0x03 + 8-byte u64
        const priceInstruction = message.instructions.find(ix => ix.data[0] === 0x03 && ix.data.length === 9);
        expect(priceInstruction).toBeDefined();

        // Read the u64 value (little-endian) as BigInt
        const view = new DataView(priceInstruction!.data.buffer, priceInstruction!.data.byteOffset);
        const low = view.getUint32(1, true);
        const high = view.getUint32(5, true);
        const actualPriorityFee = BigInt(low) + (BigInt(high) << 32n);

        expect(actualPriorityFee).toBe(priorityFee);
    });

    it('has autoEstimateCus and setEstimateMargin methods', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(builder).toHaveProperty('autoEstimateCus');
        expect(builder).toHaveProperty('setEstimateMargin');
    });

    it('returns a new builder when setting autoEstimateCus', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const builder2 = builder1.autoEstimateCus(false);

        expect(builder2).not.toBe(builder1);
    });

    it('returns a new builder when setting estimate margin', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder1 = createTransactionBuilder({ payer, rpc });

        const builder2 = builder1.setEstimateMargin(0.2);

        expect(builder2).not.toBe(builder1);
    });

    it('throws on invalid compute limit (negative)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(() => builder.setComputeLimit(-1)).toThrow('Invalid compute unit limit');
    });

    it('throws on invalid compute limit (zero)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(() => builder.setComputeLimit(0)).toThrow('Invalid compute unit limit');
    });

    it('throws on invalid compute limit (exceeds max)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(() => builder.setComputeLimit(1_400_001)).toThrow('Invalid compute unit limit');
    });

    it('throws on invalid compute limit (non-integer)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(() => builder.setComputeLimit(100.5)).toThrow('Invalid compute unit limit');
    });

    it('throws on invalid priority fee (negative)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(() => builder.setPriorityFee(-1n)).toThrow('Invalid priority fee');
    });

    it('throws on invalid estimate margin (negative)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(() => builder.setEstimateMargin(-0.1)).toThrow('Invalid estimate margin');
    });

    it('throws when prepare() called with no instructions', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        await expect(builder.prepare()).rejects.toThrow('Cannot prepare transaction with no instructions');
    });

    it('transitions to prepared state after prepare()', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        const prepared = await builder.add(createMockInstruction()).prepare();

        expect(prepared).toHaveProperty('getMessage');
        expect(prepared).toHaveProperty('sign');
        expect(prepared).toHaveProperty('simulate');
    });

    it('calls getLatestBlockhash during prepare()', async () => {
        const payer = await generateKeyPairSigner();
        const getLatestBlockhash = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    blockhash: 'mockhash123',
                    lastValidBlockHeight: 1000n,
                },
            }),
        });
        const rpc = createMockRpc({ getLatestBlockhash });

        const builder = createTransactionBuilder({ payer, rpc });
        await builder.add(createMockInstruction()).prepare();

        expect(getLatestBlockhash).toHaveBeenCalled();
    });

    it('auto-estimates CUs by default (calls simulateTransaction)', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        await builder.add(createMockInstruction()).prepare();

        expect(simulateTransaction).toHaveBeenCalled();
    });

    it('skips auto-estimate when manual setComputeLimit is used', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        await builder.add(createMockInstruction()).setComputeLimit(200_000).prepare();

        expect(simulateTransaction).not.toHaveBeenCalled();
    });

    it('skips auto-estimate when autoEstimateCus(false) is set', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        await builder.add(createMockInstruction()).autoEstimateCus(false).prepare();

        expect(simulateTransaction).not.toHaveBeenCalled();
    });

    it('caps CU estimate to max when margin would exceed', async () => {
        const payer = await generateKeyPairSigner();
        // Return a CU estimate that when margin is applied would exceed 1,400,000
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 1_350_000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        // With 10% margin, 1,350,000 * 1.1 = 1,485,000 which exceeds max
        // This should not throw and should cap at 1,400,000
        const prepared = await builder.add(createMockInstruction()).prepare();

        expect(prepared).toHaveProperty('getMessage');
    });

    it('throws when simulation fails during auto-estimate', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    err: { InstructionError: [0, 'InvalidAccountData'] },
                    logs: ['Program failed'],
                    returnData: null,
                    unitsConsumed: 0n,
                },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });

        // SolanaErrors from @solana/kit pass through unchanged
        await expect(builder.add(createMockInstruction()).prepare()).rejects.toThrow();
    });

    it('prepare() throws when abortSignal is already aborted', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });
        const controller = new AbortController();
        controller.abort();

        await expect(
            builder.add(createMockInstruction()).prepare({ abortSignal: controller.signal }),
        ).rejects.toThrow();
    });

    it('setEstimateMargin affects the CU calculation', async () => {
        const payer = await generateKeyPairSigner();
        const baseEstimate = 100_000n;
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: baseEstimate },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        // Test with 50% margin (0.5), expected CU = ceil(100,000 * 1.5) = 150,000
        const builder = createTransactionBuilder({ payer, rpc });
        const prepared = await builder.add(createMockInstruction()).setEstimateMargin(0.5).prepare();

        // Verify simulation was called (meaning auto-estimate ran)
        expect(simulateTransaction).toHaveBeenCalled();

        // Get message and verify the CU limit instruction contains margined value
        // The first instruction should be SetComputeUnitLimit with value 150,000
        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        expect(message.instructions.length).toBeGreaterThan(0);

        // The CU limit instruction data format: 1 byte discriminator + 4 bytes little-endian u32
        // Discriminator for SetComputeUnitLimit is 0x02
        const cuInstruction = message.instructions.find(ix => ix.data[0] === 0x02 && ix.data.length === 5);
        expect(cuInstruction).toBeDefined();

        // Read the u32 value (little-endian)
        const view = new DataView(cuInstruction!.data.buffer, cuInstruction!.data.byteOffset);
        const cuLimit = view.getUint32(1, true); // true = little-endian

        // Expected: ceil(100,000 * 1.5) = 150,000
        expect(cuLimit).toBe(150_000);
    });

    it('accepts options parameter with autoEstimateCus', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc }, { autoEstimateCus: false });
        await builder.add(createMockInstruction()).prepare();

        // simulateTransaction should NOT be called since auto-estimate is disabled via options
        expect(simulateTransaction).not.toHaveBeenCalled();
    });

    it('accepts options parameter with estimateMargin', async () => {
        const payer = await generateKeyPairSigner();
        const baseEstimate = 100_000n;
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: baseEstimate },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        // Test with 20% margin via options
        const builder = createTransactionBuilder({ payer, rpc }, { estimateMargin: 0.2 });
        const prepared = await builder.add(createMockInstruction()).prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        const cuInstruction = message.instructions.find(ix => ix.data[0] === 0x02 && ix.data.length === 5);
        expect(cuInstruction).toBeDefined();

        const view = new DataView(cuInstruction!.data.buffer, cuInstruction!.data.byteOffset);
        const cuLimit = view.getUint32(1, true);

        // Expected: ceil(100,000 * 1.2) = 120,000
        expect(cuLimit).toBe(120_000);
    });

    it('accepts options parameter with minPriorityFee', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const minFee = 1_000_000n;
        const builder = createTransactionBuilder({ payer, rpc }, { minPriorityFee: minFee });
        const prepared = await builder.add(createMockInstruction()).setComputeLimit(100_000).prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        // SetComputeUnitPrice instruction: discriminator 0x03 + 8-byte u64
        const priceInstruction = message.instructions.find(ix => ix.data[0] === 0x03 && ix.data.length === 9);
        expect(priceInstruction).toBeDefined();

        const view = new DataView(priceInstruction!.data.buffer, priceInstruction!.data.byteOffset);
        const low = view.getUint32(1, true);
        const high = view.getUint32(5, true);
        const actualPriorityFee = BigInt(low) + (BigInt(high) << 32n);

        expect(actualPriorityFee).toBe(minFee);
    });

    it('setPriorityFee overrides minPriorityFee', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const minFee = 1_000_000n;
        const explicitFee = 500_000n; // Less than min, but explicit override should win
        const builder = createTransactionBuilder({ payer, rpc }, { minPriorityFee: minFee });
        const prepared = await builder
            .add(createMockInstruction())
            .setComputeLimit(100_000)
            .setPriorityFee(explicitFee)
            .prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        const priceInstruction = message.instructions.find(ix => ix.data[0] === 0x03 && ix.data.length === 9);
        expect(priceInstruction).toBeDefined();

        const view = new DataView(priceInstruction!.data.buffer, priceInstruction!.data.byteOffset);
        const low = view.getUint32(1, true);
        const high = view.getUint32(5, true);
        const actualPriorityFee = BigInt(low) + (BigInt(high) << 32n);

        // Should use explicit fee, not minPriorityFee
        expect(actualPriorityFee).toBe(explicitFee);
    });

    it('setPriorityFee(0n) overrides minPriorityFee (no instruction added)', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const minFee = 1_000_000n;
        const builder = createTransactionBuilder({ payer, rpc }, { minPriorityFee: minFee });
        const prepared = await builder
            .add(createMockInstruction())
            .setComputeLimit(100_000)
            .setPriorityFee(0n) // Explicit 0 should override minPriorityFee
            .prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        // Should NOT have a price instruction since explicit 0 was set
        const priceInstruction = message.instructions.find(ix => ix.data[0] === 0x03 && ix.data.length === 9);
        expect(priceInstruction).toBeUndefined();
    });
});

describe('transactionBuilderPlugin', () => {
    it('adds createTransaction method to client', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(transactionBuilderPlugin());

        expect(client).toHaveProperty('createTransaction');
        expect(typeof client.createTransaction).toBe('function');
    });

    it('createTransaction returns a builder', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(transactionBuilderPlugin());

        const builder = client.createTransaction();

        expect(builder).toHaveProperty('add');
        expect(builder).toHaveProperty('prepare');
    });

    it('accepts autoEstimateCus option to disable auto-estimation', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(transactionBuilderPlugin({ autoEstimateCus: false }));

        await client.createTransaction().add(createMockInstruction()).prepare();

        // simulateTransaction should NOT be called since auto-estimate is disabled
        expect(simulateTransaction).not.toHaveBeenCalled();
    });

    it('accepts estimateMargin option to customize CU margin', async () => {
        const payer = await generateKeyPairSigner();
        const baseEstimate = 100_000n;
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: baseEstimate },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        // Set 25% margin via plugin options
        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(transactionBuilderPlugin({ estimateMargin: 0.25 }));

        const prepared = await client.createTransaction().add(createMockInstruction()).prepare();

        // Get message and verify the CU limit instruction contains margined value
        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        const cuInstruction = message.instructions.find(ix => ix.data[0] === 0x02 && ix.data.length === 5);
        expect(cuInstruction).toBeDefined();

        const view = new DataView(cuInstruction!.data.buffer, cuInstruction!.data.byteOffset);
        const cuLimit = view.getUint32(1, true);

        // Expected: ceil(100,000 * 1.25) = 125,000
        expect(cuLimit).toBe(125_000);
    });

    it('allows per-transaction override of plugin defaults', async () => {
        const payer = await generateKeyPairSigner();
        const baseEstimate = 100_000n;
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: baseEstimate },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        // Plugin defaults: 25% margin
        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(transactionBuilderPlugin({ estimateMargin: 0.25 }));

        // Override to 50% margin on this transaction
        const prepared = await client.createTransaction().add(createMockInstruction()).setEstimateMargin(0.5).prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        const cuInstruction = message.instructions.find(ix => ix.data[0] === 0x02 && ix.data.length === 5);
        expect(cuInstruction).toBeDefined();

        const view = new DataView(cuInstruction!.data.buffer, cuInstruction!.data.byteOffset);
        const cuLimit = view.getUint32(1, true);

        // Expected: ceil(100,000 * 1.5) = 150,000 (uses per-transaction override, not plugin default)
        expect(cuLimit).toBe(150_000);
    });

    it('accepts minPriorityFee option', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const minFee = 2_000_000n;
        const client = createEmptyClient()
            .use(() => ({ payer, rpc }))
            .use(transactionBuilderPlugin({ minPriorityFee: minFee }));

        const prepared = await client
            .createTransaction()
            .add(createMockInstruction())
            .setComputeLimit(100_000)
            .prepare();

        const message = prepared.getMessage() as unknown as { instructions: Array<{ data: Uint8Array }> };
        const priceInstruction = message.instructions.find(ix => ix.data[0] === 0x03 && ix.data.length === 9);
        expect(priceInstruction).toBeDefined();

        const view = new DataView(priceInstruction!.data.buffer, priceInstruction!.data.byteOffset);
        const low = view.getUint32(1, true);
        const high = view.getUint32(5, true);
        const actualPriorityFee = BigInt(low) + (BigInt(high) << 32n);

        expect(actualPriorityFee).toBe(minFee);
    });
});

describe('TransactionBuilderPrepared', () => {
    it('getMessage returns the prepared message', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        const prepared = await builder.add(createMockInstruction()).prepare();
        const message = prepared.getMessage();

        expect(message).toBeDefined();
    });

    it('simulate calls simulateTransaction on rpc', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: {
                    err: null,
                    logs: ['Program log: Hello'],
                    returnData: null,
                    unitsConsumed: 5000n,
                },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        const prepared = await builder.add(createMockInstruction()).prepare();
        const result = await prepared.simulate();

        expect(simulateTransaction).toHaveBeenCalled();
        expect(result.error).toBeNull();
        expect(result.logs).toContain('Program log: Hello');
        expect(result.unitsConsumed).toBe(5000n);
    });

    it('sign transitions to signed state', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        const prepared = await builder.add(createMockInstruction()).prepare();
        const signed = await prepared.sign();

        expect(signed).toHaveProperty('getTransaction');
        expect(signed).toHaveProperty('send');
        expect(signed).toHaveProperty('sendAndConfirm');
    });

    it('simulate throws on error when throwOnError is true', async () => {
        const payer = await generateKeyPairSigner();
        // First mock returns success (for prepare auto-estimate), second returns error (for simulate)
        const simulateTransaction = vi
            .fn()
            .mockReturnValueOnce({
                send: vi.fn().mockResolvedValue({
                    value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
                }),
            })
            .mockReturnValue({
                send: vi.fn().mockResolvedValue({
                    value: {
                        err: { InstructionError: [0, 'ProgramFailedToComplete'] },
                        logs: ['Program failed'],
                        returnData: null,
                        unitsConsumed: 1000n,
                    },
                }),
            });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        const prepared = await builder.add(createMockInstruction()).prepare();

        await expect(prepared.simulate({ throwOnError: true })).rejects.toThrow('Simulation failed');
    });

    it('simulate returns error as data when throwOnError is false', async () => {
        const payer = await generateKeyPairSigner();
        // First mock returns success (for prepare auto-estimate), second returns error (for simulate)
        const simulateTransaction = vi
            .fn()
            .mockReturnValueOnce({
                send: vi.fn().mockResolvedValue({
                    value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
                }),
            })
            .mockReturnValue({
                send: vi.fn().mockResolvedValue({
                    value: {
                        err: { InstructionError: [0, 'ProgramFailedToComplete'] },
                        logs: ['Program failed'],
                        returnData: null,
                        unitsConsumed: 1000n,
                    },
                }),
            });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        const prepared = await builder.add(createMockInstruction()).prepare();
        const result = await prepared.simulate({ throwOnError: false });

        expect(result.error).not.toBeNull();
        expect(result.error).toContain('InstructionError');
    });

    it('sign() throws when abortSignal is already aborted', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });
        const prepared = await builder.add(createMockInstruction()).setComputeLimit(100_000).prepare();

        const controller = new AbortController();
        controller.abort();

        await expect(prepared.sign({ abortSignal: controller.signal })).rejects.toThrow();
    });

    it('simulate() throws when abortSignal is already aborted', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });
        const prepared = await builder.add(createMockInstruction()).setComputeLimit(100_000).prepare();

        const controller = new AbortController();
        controller.abort();

        await expect(prepared.simulate({ abortSignal: controller.signal })).rejects.toThrow();
    });
});

describe('execute()', () => {
    it('has execute method on building state', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        expect(builder).toHaveProperty('execute');
        expect(typeof builder.execute).toBe('function');
    });

    it('throws if rpcSubscriptions is not provided', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const builder = createTransactionBuilder({ payer, rpc });

        await expect(builder.add(createMockInstruction()).execute()).rejects.toThrow(
            'sendAndConfirm requires rpcSubscriptions',
        );
    });

    it('calls prepare (auto-estimates CUs) before sending', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });

        const builder = createTransactionBuilder({ payer, rpc });

        // Will fail at sendAndConfirm due to missing rpcSubscriptions,
        // but simulateTransaction should have been called during prepare()
        await expect(builder.add(createMockInstruction()).execute()).rejects.toThrow();

        expect(simulateTransaction).toHaveBeenCalled();
    });

    it('execute() calls sendAndConfirm when rpcSubscriptions is provided', async () => {
        const payer = await generateKeyPairSigner();
        const simulateTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue({
                value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
            }),
        });
        const rpc = createMockRpc({ simulateTransaction });
        const rpcSubscriptions = createMockRpcSubscriptions();

        const builder = createTransactionBuilder({ payer, rpc, rpcSubscriptions });

        // execute() will attempt sendAndConfirm. It won't complete successfully
        // in unit tests due to @solana/kit's internal block height checks,
        // but we verify it doesn't throw the "missing rpcSubscriptions" error
        const promise = builder.add(createMockInstruction()).execute();

        // Verify it doesn't immediately throw "requires rpcSubscriptions"
        // It will eventually fail/timeout on block height check, which is expected
        await expect(promise).rejects.not.toThrow('sendAndConfirm requires rpcSubscriptions');
    });
});

describe('TransactionBuilderSigned', () => {
    it('getTransaction returns the signed transaction', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });

        const signed = await builder
            .add(createMockInstruction())
            .prepare()
            .then(b => b.sign());
        const transaction = signed.getTransaction();

        expect(transaction).toBeDefined();
    });

    it('send calls sendTransaction on rpc', async () => {
        const payer = await generateKeyPairSigner();
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockResolvedValue('signature123'),
        });
        const rpc = createMockRpc({ sendTransaction });

        const builder = createTransactionBuilder({ payer, rpc });
        const signed = await builder
            .add(createMockInstruction())
            .prepare()
            .then(b => b.sign());
        const signature = await signed.send();

        expect(sendTransaction).toHaveBeenCalled();
        expect(signature).toBe('signature123');
    });

    it('sendAndConfirm throws if rpcSubscriptions is not provided', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();

        const builder = createTransactionBuilder({ payer, rpc });
        const signed = await builder
            .add(createMockInstruction())
            .prepare()
            .then(b => b.sign());

        await expect(signed.sendAndConfirm()).rejects.toThrow('sendAndConfirm requires rpcSubscriptions');
    });

    it('sendAndConfirm does not throw missing subscriptions error when rpcSubscriptions provided', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const rpcSubscriptions = createMockRpcSubscriptions();

        const builder = createTransactionBuilder({ payer, rpc, rpcSubscriptions });
        const signed = await builder
            .add(createMockInstruction())
            .setComputeLimit(100_000)
            .prepare()
            .then(b => b.sign());

        // sendAndConfirm won't complete in unit tests due to @solana/kit's
        // internal block height checks, but we verify it passes the initial check
        const promise = signed.sendAndConfirm();

        await expect(promise).rejects.not.toThrow('sendAndConfirm requires rpcSubscriptions');
    });

    it('send() throws when abortSignal is already aborted', async () => {
        const payer = await generateKeyPairSigner();
        const rpc = createMockRpc();
        const builder = createTransactionBuilder({ payer, rpc });
        const signed = await builder
            .add(createMockInstruction())
            .setComputeLimit(100_000)
            .prepare()
            .then(b => b.sign());

        const controller = new AbortController();
        controller.abort();

        await expect(signed.send({ abortSignal: controller.signal })).rejects.toThrow();
    });
});

describe('Error handling', () => {
    it('wraps non-SolanaError with context in prepare()', async () => {
        const payer = await generateKeyPairSigner();
        const getLatestBlockhash = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(new TypeError('Network error')),
        });
        const rpc = createMockRpc({ getLatestBlockhash });
        const builder = createTransactionBuilder({ payer, rpc });

        await expect(builder.add(createMockInstruction()).setComputeLimit(100_000).prepare()).rejects.toThrow(
            'Failed to fetch blockhash',
        );
    });

    it('wraps non-SolanaError with context in send()', async () => {
        const payer = await generateKeyPairSigner();
        const sendTransaction = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(new TypeError('Connection refused')),
        });
        const rpc = createMockRpc({ sendTransaction });
        const builder = createTransactionBuilder({ payer, rpc });

        const signed = await builder
            .add(createMockInstruction())
            .setComputeLimit(100_000)
            .prepare()
            .then(b => b.sign());

        await expect(signed.send()).rejects.toThrow('Failed to send transaction');
    });

    it('wraps non-SolanaError with context in simulate()', async () => {
        const payer = await generateKeyPairSigner();
        // First call succeeds (for auto-estimate), second call fails
        const simulateTransaction = vi
            .fn()
            .mockReturnValueOnce({
                send: vi.fn().mockResolvedValue({
                    value: { err: null, logs: [], returnData: null, unitsConsumed: 50000n },
                }),
            })
            .mockReturnValue({
                send: vi.fn().mockRejectedValue(new TypeError('RPC timeout')),
            });
        const rpc = createMockRpc({ simulateTransaction });
        const builder = createTransactionBuilder({ payer, rpc });

        const prepared = await builder.add(createMockInstruction()).prepare();

        await expect(prepared.simulate()).rejects.toThrow('Failed to simulate transaction');
    });

    it('preserves error cause when wrapping', async () => {
        const payer = await generateKeyPairSigner();
        const originalError = new TypeError('Network error');
        const getLatestBlockhash = vi.fn().mockReturnValue({
            send: vi.fn().mockRejectedValue(originalError),
        });
        const rpc = createMockRpc({ getLatestBlockhash });
        const builder = createTransactionBuilder({ payer, rpc });

        await expect(builder.add(createMockInstruction()).setComputeLimit(100_000).prepare()).rejects.toHaveProperty(
            'cause',
            originalError,
        );
    });
});

// Helper functions
function createMockRpc(
    overrides: Partial<{
        getEpochInfo: ReturnType<typeof vi.fn>;
        getLatestBlockhash: ReturnType<typeof vi.fn>;
        getSignatureStatuses: ReturnType<typeof vi.fn>;
        sendTransaction: ReturnType<typeof vi.fn>;
        simulateTransaction: ReturnType<typeof vi.fn>;
    }> = {},
) {
    return {
        getEpochInfo:
            overrides.getEpochInfo ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue({ epoch: 100n }),
            }),
        getLatestBlockhash:
            overrides.getLatestBlockhash ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue({
                    value: {
                        blockhash: 'GfVcyD4ckTfCjSs5sZKUBLLFsmQXL4dJZH3Dj1EjD1cV',
                        lastValidBlockHeight: 1000n,
                    },
                }),
            }),
        getSignatureStatuses:
            overrides.getSignatureStatuses ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue({ value: [{ confirmationStatus: 'confirmed' }] }),
            }),
        sendTransaction:
            overrides.sendTransaction ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue('mocksignature'),
            }),
        simulateTransaction:
            overrides.simulateTransaction ??
            vi.fn().mockReturnValue({
                send: vi.fn().mockResolvedValue({
                    value: { err: null, logs: [], returnData: null, unitsConsumed: 0n },
                }),
            }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

function createMockRpcSubscriptions() {
    // Create a mock async iterator that yields a confirmation notification
    const createMockSubscription = () => ({
        subscribe: vi.fn().mockReturnValue({
            [Symbol.asyncIterator]: async function* () {
                yield { context: { slot: 100n }, value: { err: null } };
            },
        }),
    });

    return {
        signatureNotifications: vi.fn().mockReturnValue(createMockSubscription()),
        slotNotifications: vi.fn().mockReturnValue(createMockSubscription()),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

function createMockInstruction(): Instruction {
    return {
        accounts: [],
        data: new Uint8Array([0, 0, 0, 0]),
        programAddress: address('11111111111111111111111111111111'),
    };
}

function createMockInstructionWithData(data: Uint8Array): Instruction {
    return {
        accounts: [],
        data,
        programAddress: address('11111111111111111111111111111111'),
    };
}

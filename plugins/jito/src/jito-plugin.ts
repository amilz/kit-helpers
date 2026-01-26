import { createJitoClient } from './jito-client';
import type { JitoApi, JitoClientRequirements, JitoPluginConfig } from './types';

/**
 * A plugin that adds Jito bundle functionality to the client.
 *
 * Provides access to Jito Block Engine APIs for:
 * - Bundle submission with atomic execution
 * - Tip account management
 * - Bundle status polling
 * - MEV-protected transaction sending
 *
 * @param config - Plugin configuration.
 * @param config.endpoint - Jito Block Engine endpoint URL (required).
 * @param config.uuid - Optional UUID for authentication (increases rate limits).
 *
 * @example
 * Basic setup with mainnet Block Engine.
 * ```ts
 * import { createEmptyClient, lamports } from '@solana/kit';
 * import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
 * import { jitoPlugin } from '@kit-helpers/jito';
 *
 * const client = await createEmptyClient()
 *     .use(localhostRpc())
 *     .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *     .use(jitoPlugin({
 *         endpoint: 'https://mainnet.block-engine.jito.wtf/api/v1',
 *     }));
 *
 * // Get tip accounts
 * const tipAccounts = await client.jito.getTipAccounts();
 * console.log('Tip accounts:', tipAccounts);
 *
 * // Get a random tip account
 * const tipAccount = await client.jito.getRandomTipAccount();
 * ```
 *
 * @example
 * Send a bundle using the fluent builder.
 * ```ts
 * // Build and send a bundle
 * const bundleId = await client.jito
 *     .createBundle()
 *     .add(encodedTx1)
 *     .add(encodedTx2)
 *     .send();
 *
 * console.log('Bundle ID:', bundleId);
 *
 * // Poll for status
 * const statuses = await client.jito.getInflightBundleStatuses([bundleId]);
 * console.log('Status:', statuses[0]?.status);
 * ```
 *
 * @example
 * Send a single transaction with MEV protection.
 * ```ts
 * const signature = await client.jito.sendTransaction(encodedTx, {
 *     encoding: 'base64',
 *     skipPreflight: false,
 * });
 * ```
 *
 * @example
 * Simulate a bundle before sending.
 * ```ts
 * const simulation = await client.jito
 *     .createBundle()
 *     .add(encodedTx1)
 *     .add(encodedTx2)
 *     .simulate();
 *
 * if (simulation.summary === 'succeeded') {
 *     console.log('Simulation succeeded!');
 *     // Now send the bundle
 * } else {
 *     console.log('Simulation failed:', simulation.transactionResults);
 * }
 * ```
 */
export function jitoPlugin(config: JitoPluginConfig) {
    if (!config.endpoint) {
        throw new Error('Jito endpoint is required');
    }

    return <T extends JitoClientRequirements>(client: T): T & { jito: JitoApi } => {
        const jitoClient = createJitoClient(config);

        return {
            ...client,
            jito: jitoClient,
        };
    };
}

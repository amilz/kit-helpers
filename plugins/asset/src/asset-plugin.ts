import type { Address } from '@solana/kit';

import { MAINNET_ASSETS } from './assets';
import type { AssetNamespace } from './types';

export type AssetPluginOptions<TCustom extends Record<string, Address> = Record<string, never>> = {
    custom?: TCustom;
};

export function assetPlugin<TCustom extends Record<string, Address> = Record<string, never>>(
    options?: AssetPluginOptions<TCustom>,
) {
    return <T>(client: T): T & { asset: AssetNamespace<TCustom> } => ({
        ...client,
        asset: createAssetNamespace(options),
    });
}

export function createAssetNamespace<TCustom extends Record<string, Address> = Record<string, never>>(
    options?: AssetPluginOptions<TCustom>,
): AssetNamespace<TCustom> {
    const allAssets: Record<string, Address> = { ...MAINNET_ASSETS, ...options?.custom };

    return {
        ...MAINNET_ASSETS,
        ...options?.custom,
        resolve(name: string): Address {
            const addr = allAssets[name];
            if (!addr) {
                throw new Error(`Unknown asset: "${name}". Available: ${Object.keys(allAssets).join(', ')}`);
            }
            return addr;
        },
    } as AssetNamespace<TCustom>;
}

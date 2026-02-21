import type { Address } from '@solana/kit';

import { MAINNET_ASSETS } from './assets';
import type { AssetNamespace } from './types';
import { AssetCollisionError, AssetReservedNameError, UnknownAssetError } from './types';

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
    if (options?.custom) {
        if ('resolve' in options.custom) {
            throw new AssetReservedNameError('resolve');
        }
        const collisions = Object.keys(options.custom).filter(key => key in MAINNET_ASSETS);
        if (collisions.length > 0) {
            throw new AssetCollisionError(collisions);
        }
    }

    const allAssets: Record<string, Address> = { ...MAINNET_ASSETS, ...options?.custom };

    return Object.freeze({
        ...MAINNET_ASSETS,
        ...options?.custom,
        resolve(name: string): Address {
            if (!(name in allAssets)) {
                throw new UnknownAssetError(name, Object.keys(allAssets));
            }
            return allAssets[name];
        },
    } as AssetNamespace<TCustom>);
}

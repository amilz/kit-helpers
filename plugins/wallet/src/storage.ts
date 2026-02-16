/** Interface for persisting wallet connection state. */
export type WalletStorage = {
    get(key: string): string | null;
    remove(key: string): void;
    set(key: string, value: string): void;
};

const STORAGE_PREFIX = 'kit-helpers:wallet:';

/** Create a storage adapter backed by localStorage. */
export function createLocalStorage(prefix: string = STORAGE_PREFIX): WalletStorage {
    return {
        get(key: string): string | null {
            try {
                return localStorage.getItem(prefix + key);
            } catch {
                return null;
            }
        },
        remove(key: string): void {
            try {
                localStorage.removeItem(prefix + key);
            } catch {
                // ignore
            }
        },
        set(key: string, value: string): void {
            try {
                localStorage.setItem(prefix + key, value);
            } catch {
                // Silently fail (e.g., storage full, private browsing)
            }
        },
    };
}

/** Create a no-op storage adapter (SSR-safe, does nothing). */
export function createNoopStorage(): WalletStorage {
    return {
        get(): null {
            return null;
        },
        remove(): void {},
        set(): void {},
    };
}

/** Auto-detect the best available storage. Uses localStorage in browsers, noop elsewhere. */
export function detectStorage(): WalletStorage {
    try {
        if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined') {
            // Verify it actually works (private browsing may throw)
            const testKey = STORAGE_PREFIX + '__test__';
            globalThis.localStorage.setItem(testKey, '1');
            globalThis.localStorage.removeItem(testKey);
            return createLocalStorage();
        }
    } catch {
        // ignore
    }
    return createNoopStorage();
}

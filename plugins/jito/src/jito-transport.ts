import type { JitoPluginConfig } from './types';

/** JSON-RPC request structure. */
type RpcRequest = {
    id: number;
    jsonrpc: '2.0';
    method: string;
    params: unknown[];
};

/** JSON-RPC response structure. */
type RpcResponse<T> = {
    error?: {
        code: number;
        data?: unknown;
        message: string;
    };
    id: number;
    jsonrpc: '2.0';
    result?: T;
};

/** Error thrown by Jito RPC operations. */
export class JitoRpcError extends Error {
    constructor(
        message: string,
        public readonly code?: number,
        public readonly data?: unknown,
    ) {
        super(message);
        this.name = 'JitoRpcError';
    }
}

/**
 * Create a JSON-RPC transport for Jito Block Engine.
 * @param config - Plugin configuration with endpoint and optional UUID.
 */
export function createJitoTransport(config: JitoPluginConfig) {
    let requestId = 0;

    /**
     * Make a JSON-RPC call to the Jito endpoint.
     * @param method - RPC method name.
     * @param params - Method parameters.
     * @returns The result from the RPC response.
     */
    async function call<T>(method: string, params: unknown[]): Promise<T> {
        const request: RpcRequest = {
            id: ++requestId,
            jsonrpc: '2.0',
            method,
            params,
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (config.uuid) {
            headers['x-jito-auth'] = config.uuid;
        }

        let response: Response;
        try {
            response = await fetch(config.endpoint, {
                body: JSON.stringify(request),
                headers,
                method: 'POST',
            });
        } catch (error) {
            throw new JitoRpcError(`Jito request failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (!response.ok) {
            throw new JitoRpcError(
                `Jito request failed with status ${response.status}: ${response.statusText}`,
                response.status,
            );
        }

        let data: RpcResponse<T>;
        try {
            data = (await response.json()) as RpcResponse<T>;
        } catch (error) {
            throw new JitoRpcError(
                `Failed to parse Jito response: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        if (data.error) {
            throw new JitoRpcError(data.error.message, data.error.code, data.error.data);
        }

        if (data.result === undefined) {
            throw new JitoRpcError('Jito response missing result');
        }

        return data.result;
    }

    return { call };
}

/** Transport type for Jito RPC calls. */
export type JitoTransport = ReturnType<typeof createJitoTransport>;

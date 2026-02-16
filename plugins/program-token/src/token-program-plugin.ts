import { createTokenProgramNamespace } from './token-program';
import type { TokenProgramClientRequirements, TokenProgramNamespace } from './types';

export function tokenProgramPlugin() {
    return <T extends TokenProgramClientRequirements>(
        client: T,
    ): T & { program: { token: TokenProgramNamespace } } => ({
        ...client,
        program: {
            ...((client as Record<string, unknown>).program as object),
            token: createTokenProgramNamespace(client),
        },
    });
}

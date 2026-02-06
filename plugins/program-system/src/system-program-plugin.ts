import { createSystemProgramNamespace } from './system-program';
import type { SystemProgramClientRequirements, SystemProgramNamespace } from './types';

export function systemProgramPlugin() {
    return <T extends SystemProgramClientRequirements>(
        client: T,
    ): T & { program: { system: SystemProgramNamespace } } => ({
        ...client,
        program: {
            ...((client as Record<string, unknown>).program as object),
            system: createSystemProgramNamespace(client),
        },
    });
}

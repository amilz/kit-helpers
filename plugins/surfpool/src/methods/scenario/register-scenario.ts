import type { Address } from '@solana/kit';

export type ScenarioOverride = Readonly<{
    account: Readonly<{ pubkey: Address }>;
    enabled: boolean;
    fetchBeforeUse: boolean;
    id: string;
    label: string;
    scenarioRelativeSlot: number;
    templateId: string;
    values: Record<string, unknown>;
}>;

export type Scenario = Readonly<{
    description: string;
    id: string;
    name: string;
    overrides: readonly ScenarioOverride[];
    tags: readonly string[];
}>;

export type SurfnetRegisterScenarioApi = {
    registerScenario(scenario: Scenario, slot?: number): null;
};
